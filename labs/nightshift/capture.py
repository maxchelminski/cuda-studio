"""Reproduce the gallery's stills, effect comparisons, and scripted CUDA camera shots."""
import argparse
from dataclasses import replace
import math
from pathlib import Path
import subprocess
import tempfile

from engine import Renderer, Shot, TITLES, save_image


def composition(scene, width=1280, samples=4):
    s = Shot(width=width,height=round(width*9/16),samples=samples)
    if scene=="lighting": return replace(s,time=0,yaw=-.10,pitch=-.025,control=.68)
    if scene=="creature": return replace(s,time=2,control=.5)
    if scene=="textile": return replace(s,time=3,yaw=-.045,pitch=.035,control=.53)
    return replace(s,time=3.1,control=.47)


def shot_at(scene, s, p):
    ease=(1-math.cos(math.pi*p))*.5
    if scene=="lighting":
        return replace(s,time=p*7.5,yaw=s.yaw+.095*ease)
    if scene=="creature":
        return replace(s,time=8.2+6.1*p,yaw=-.09+.20*ease,control=.72-.35*ease)
    if scene=="textile":
        return replace(s,time=.65+4*p,control=.15,yaw=.035*ease)
    return replace(s,time=-2+7*p,yaw=-.53+1.01*ease)


def capture(scene, path, width, samples, ffmpeg, encoder, fps, seconds):
    path=Path(path)
    path.mkdir(parents=True,exist_ok=True)
    shot=composition(scene,width,samples)
    with Renderer(scene) as renderer:
        for suffix, still in (("beauty",shot),("off",replace(shot,features=shot.features&~1)),
                              ("normals",replace(shot,view="normals"))):
            save_image(path/f"{scene}-{suffix}.jpg",renderer.render(still,poison=True),still)
        if not ffmpeg:return
        handler=None
        if scene=="textile":
            from textile_input import TextileInteraction
            handler=TextileInteraction(renderer.gpu)
        try:
            # Keep temporary JPEGs on the same drive as the chosen output.
            with tempfile.TemporaryDirectory(dir=path) as tmp:
                frames=max(2,round(fps*seconds))
                for i in range(frames):
                    p=i/(frames-1);s=shot_at(scene,shot,p)
                    if handler:
                        args=(s.width/s.height,s.time,s.yaw,s.pitch,s.control)
                        if i==frames//5:
                            handler.grab(-.09,.04,*args)
                        elif frames//5 < i <= 3*frames//5:
                            t=(i-frames//5)/(3*frames//5-frames//5)
                            handler.drag(-.09+.38*t,.04+.19*t,*args)
                        elif i==3*frames//5+1:
                            if not handler.marks:raise RuntimeError("The scripted pull missed the textile.")
                            handler.release()
                    save_image(Path(tmp)/f"{i:04}.jpg",renderer.render(s),s)
                cmd=[str(ffmpeg),"-hide_banner","-loglevel","error","-framerate",str(fps),
                     "-i",str(Path(tmp)/"%04d.jpg"),"-an","-c:v",encoder,"-b:v","4100k",
                     "-pix_fmt","yuv420p","-movflags","+faststart","-y",str(path/(scene+".mp4"))]
                subprocess.run(cmd,check=True)
        finally:
            if handler:handler.close()


if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--scene",choices=(*TITLES,"all"),default="all")
    p.add_argument("--out",type=Path,required=True)
    p.add_argument("--width",type=int,default=960)
    p.add_argument("--samples",type=int,choices=(1,4,9),default=4)
    p.add_argument("--ffmpeg",help="path to FFmpeg with image2, MJPEG decoding and an H.264 encoder")
    p.add_argument("--encoder",default="libx264",help="e.g. libx264 or h264_nvenc")
    p.add_argument("--fps",type=int,default=24)
    p.add_argument("--seconds",type=float,default=5)
    a=p.parse_args()
    if not 128<=a.width<=3840 or a.width%2 or round(a.width*9/16)%2:
        p.error("choose an even output width with an even 16:9 height, e.g. 960 or 1280")
    if not (1<=a.fps<=60 and .5<=a.seconds<=120):p.error("choose 1–60 fps and 0.5–120 seconds")
    for scene in TITLES if a.scene=="all" else [a.scene]:
        capture(scene,a.out,a.width,a.samples,a.ffmpeg,a.encoder,a.fps,a.seconds)
        print(f"Captured {scene}",flush=True)
