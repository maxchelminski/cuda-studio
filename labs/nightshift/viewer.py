"""Interactive, native Tk viewport; pixels for all four scenes come from CUDA."""
from dataclasses import replace
from pathlib import Path
import time
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

from engine import HERE, MODES, TITLES, VIEWS, Renderer, compare, save_image

LABELS = {
    "lighting": ("Wetness", "Reflections", "Ripple detail", "Bays visited"),
    "creature": ("Gate opening", "Wet surface", "Surface detail", "Traversal cost"),
    "textile": ("Strain", "Fiber sheen", "Yarn detail", "Sections tested"),
    "soundstage": ("Roughness", "Reflections", "Normal map", "Triangle tests"),
}


def viewport(scene, initial):
    root = tk.Tk()
    root.title("Night Shift  /  CUDA graphics lab")
    root.configure(bg="#151d20")
    top = tk.Frame(root,bg="#151d20")
    top.pack(fill="x",padx=10,pady=(8,5))
    scene_name = tk.StringVar(value=TITLES[scene])
    mode = tk.StringVar(value=initial.mode)
    view = tk.StringVar(value=initial.view)
    samples = tk.IntVar(value=initial.samples)
    def selector(parent, variable, values, width, on_change):
        box = ttk.Combobox(parent,textvariable=variable,values=values,state="readonly",width=width)
        box.pack(side="left",padx=(0,7))
        box.bind("<<ComboboxSelected>>",on_change)
        return box
    selector(top,scene_name,list(TITLES.values()),23,lambda _:switch())
    selector(top,mode,MODES,10,lambda _:None)
    selector(top,view,VIEWS,8,lambda _:None)
    selector(top,samples,(1,4,9),3,lambda _:None)
    def button(parent,name,cmd):
        b=tk.Button(parent,text=name,command=cmd,bg="#2e3b3d",fg="#f2edda",activebackground="#506966",
                    activeforeground="white",relief="flat",padx=6)
        b.pack(side="left",padx=(0,4))
        return b
    pause_button=button(top,"Pause",lambda:pause())
    button(top,"Compare V",lambda:validate())
    button(top,"Reload R",lambda:recompile())
    button(top,"Save current pass",lambda:save())
    canvas = tk.Canvas(root,width=initial.width,height=initial.height,bg="#0e1618",highlightthickness=0)
    canvas.pack()
    item=canvas.create_image(0,0,anchor="nw")
    second=tk.Frame(root,bg="#151d20")
    second.pack(fill="x",padx=10,pady=(6,3))
    flags=[tk.BooleanVar(value=bool(initial.features & (1<<i))) for i in range(3)]
    def checkbox(label,variable):
        b=tk.Checkbutton(second,text=label,variable=variable,bg="#151d20",fg="#e4dfd0",
                         selectcolor="#364045",activebackground="#151d20",activeforeground="white")
        b.pack(side="left")
        return b
    switches=[checkbox(name,flag) for name,flag in zip(("Material","Shadows","Detail"),flags)]
    delta=tk.BooleanVar(value=False)
    checkbox("Split A/B",delta)
    label=tk.Label(second,bg="#151d20",fg="#d5cfbb")
    label.pack(side="left",padx=(10,3))
    control=tk.DoubleVar(value=initial.control)
    slider=tk.Scale(second,from_=0,to=1,resolution=.01,orient="horizontal",length=122,
                    variable=control,bg="#151d20",fg="#e6e0d0",highlightthickness=0,
                    troughcolor="#344546",showvalue=False)
    slider.pack(side="left")
    how=tk.Label(root,bg="#151d20",fg="#b7c3c1",anchor="w",font=("Segoe UI",9))
    how.pack(fill="x",padx=12)
    status=tk.Label(root,bg="#151d20",fg="#e4e2c8",anchor="w",font=("Consolas",9))
    status.pack(fill="x",padx=12,pady=(4,8))

    renderer = interaction = None
    image = None
    paused=False
    phase,yaw,pitch=initial.time,initial.yaw,initial.pitch
    last=time.perf_counter()
    frame_count=0
    fps_start=last
    fps=0.0
    message=""
    comparison=None
    origin=None
    scene_lookup={name:key for key,name in TITLES.items()}

    def shot():
        return replace(initial,time=phase,yaw=yaw,pitch=pitch,mode=mode.get(),view=view.get(),
                       control=control.get(),features=sum(1<<i for i,v in enumerate(flags) if v.get()),samples=samples.get())
    def release_current():
        nonlocal renderer,interaction
        if interaction:
            interaction.close()
            interaction=None
        if renderer:
            renderer.close()
            renderer=None
    def switch():
        nonlocal scene,renderer,interaction,phase,yaw,pitch,message,comparison
        proposed=scene_lookup[scene_name.get()]
        # Create first so an asset or compiler error leaves the current shot available.
        fresh=None
        try:
            fresh=Renderer(proposed)
            handler=None
            if proposed=="textile":
                from textile_input import TextileInteraction
                handler=TextileInteraction(fresh.gpu)
        except Exception as exc:
            if fresh: fresh.close()
            if renderer: scene_name.set(TITLES[scene])
            messagebox.showerror("Opening the scene",str(exc))
            return
        release_current()
        scene,renderer,interaction=proposed,fresh,handler
        phase,yaw,pitch=initial.time,initial.yaw,initial.pitch
        control.set(initial.control);comparison=None;message=""
        parameter,material,detail,diagnostic=LABELS[scene]
        label.configure(text=parameter);switches[0].configure(text=material);switches[2].configure(text=detail)
        guidance="Left drag pulls fabric  ·  C clears damage  ·  " if interaction else ""
        how.configure(text=guidance+"Right drag or arrows rotate  ·  Space freezes  ·  1/2/3 traversal  ·  Work: "+diagnostic)
    def pause():
        nonlocal paused
        paused=not paused
        pause_button.configure(text="Play" if paused else "Pause")
    def validate():
        nonlocal message,comparison
        if not renderer:return
        if not paused:pause()
        s=replace(shot(),view="beauty",mode="student")
        comparison=None
        message=""
        try:
            ref=renderer.render(replace(s,mode="reference"),True)
            choice=renderer.render(s,True)
            count,maxdiff,err=compare(ref,choice)
            result=f"Beauty · student v reference • {count:,} pixels differ, max {maxdiff}/255, RGB RMSE {err:.5f}"
            comparison=(s,result)
        except Exception as exc:messagebox.showerror("Validation",str(exc))
    def recompile():
        nonlocal message,comparison
        if not renderer:return
        try:
            renderer.reload(interaction)
            comparison=None
            mode.set("student");message="Compiled your student path."
        except Exception as exc:messagebox.showerror("CUDA reload",str(exc))
    def save():
        if not renderer:return
        path=filedialog.asksaveasfilename(initialdir=HERE.parents[1],initialfile=scene+".png",
               defaultextension=".png",filetypes=(("PNG image","*.png"),("Portable pixmap","*.ppm")))
        if path:
            try:
                s=shot();save_image(Path(path),renderer.render(s,True),s)
            except Exception as exc:messagebox.showerror("Saving the image",str(exc))
    def angle(dx,dy):
        nonlocal yaw,pitch
        yaw=max(-1.05,min(1.05,yaw+dx));pitch=max(-.43,min(.43,pitch+dy))
    def press(e):
        nonlocal origin
        origin=(e.x,e.y)
    def orbit(e):
        nonlocal origin
        if origin:
            angle((origin[0]-e.x)*.004,(e.y-origin[1])*.003)
        origin=(e.x,e.y)
    def fabric(method,e=None):
        nonlocal message,comparison
        if not interaction:return
        comparison=None
        try:
            args=() if e is None else (2*e.x/initial.width-1,1-2*e.y/initial.height,
                         initial.width/initial.height,phase,yaw,pitch,control.get())
            answer=getattr(interaction,method)(*args)
            if isinstance(answer,str):message=answer
        except Exception as exc:messagebox.showerror("Textile interaction",str(exc))
    canvas.bind("<ButtonPress-3>",press);canvas.bind("<B3-Motion>",orbit)
    canvas.bind("<ButtonPress-1>",lambda e:fabric("grab",e) if interaction else press(e))
    canvas.bind("<B1-Motion>",lambda e:fabric("drag",e) if interaction else orbit(e))
    canvas.bind("<ButtonRelease-1>",lambda e:fabric("release"))
    root.bind("c",lambda e:fabric("clear"))
    for key,dx,dy in (("Left",-.06,0),("Right",.06,0),("Up",0,.04),("Down",0,-.04)):
        root.bind("<"+key+">",lambda e,x=dx,y=dy:angle(x,y))
    for i,name in enumerate(MODES,1):root.bind(str(i),lambda e,n=name:mode.set(n))
    root.bind("<space>",lambda e:pause())
    root.bind("v",lambda e:validate());root.bind("r",lambda e:recompile())
    root.bind("<Home>",lambda e:angle(initial.yaw-yaw,initial.pitch-pitch))
    root.bind("<Escape>",lambda e:root.destroy())
    def draw():
        nonlocal last,phase,comparison,image,frame_count,fps_start,fps
        if not renderer:return
        now=time.perf_counter()
        if not paused:phase+=min(now-last,.15)
        last=now
        s=shot()
        try:
            frame=renderer.render(s)
            rgb=frame.rgb()
            if delta.get():
                off=renderer.render(replace(s,features=s.features&~1))
                ref=off.rgb();pixels=bytearray(rgb)
                for y in range(s.height):
                    start=y*s.width*3;end=start+(s.width//2)*3
                    pixels[start:end]=ref[start:end];pixels[end:end+3]=b'\xff\xd4\x8a'
                rgb=bytes(pixels)
            image=tk.PhotoImage(data=f"P6\n{s.width} {s.height}\n255\n".encode()+rgb,format="PPM")
            canvas.itemconfigure(item,image=image)
        except Exception as exc:
            messagebox.showerror("Frame failed",str(exc));root.destroy();return
        frame_count+=1
        if now-fps_start>=.6:
            fps=frame_count/(now-fps_start);fps_start=now;frame_count=0
        if comparison and comparison[0] != replace(s,view="beauty",mode="student"):
            comparison=None
        suffix=comparison[1] if comparison else message
        if not suffix:
            suffix=("Left: "+LABELS[scene][1]+" off  |  Right: current settings" if delta.get()
                    else renderer.gpu.name.split("|")[0].strip())
        status.configure(text=f"{fps:.1f} display FPS   {frame.gpu_ms:.2f} GPU ms ({'right' if delta.get() else 'frame'})   {s.samples} spp   t {phase:.2f}   {suffix}")
        root.after(10,draw)
    try:
        switch()
        if renderer:
            root.after(1,draw);root.mainloop()
        else:root.destroy()
    finally:
        release_current()
