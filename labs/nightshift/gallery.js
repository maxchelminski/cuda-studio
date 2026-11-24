// Local captures and ordinary hash links keep the gallery usable directly from disk.
"use strict";

const scenes = {
  lighting: {
    title: "After the last train",
    session: "4/lighting",
    placement: "After Week 4, Day 3 · 75 minutes",
    alt: "An illuminated metro train, a lone passenger and a hanging North Loop sign reflected on wet platform tiles",
    caption: "Read the destination sign in the puddle, then follow the strip lights toward the end of the platform.",
    off: "Reflections off",
    compare: "Watch the inverted lettering and the train lights disappear from the paving as the divider moves.",
    normals: "The platform points mostly upward. Small color variations in the puddle show the ripples that change the reflected ray’s direction.",
    film: "As the cab recedes, its reflection and the splash rings on the platform move through the same shot.",
    exercise: "Cull a whole platform bay",
    question: "Can you skip an entire group of beams, signs, and lights and keep every pixel of the reflection?",
    steps: [
      "Open the station in the native viewer. Pause, turn Reflections off and on, and identify a reflected object that depends on the camera position.",
      "Switch to Work. Compare Reference (1) and Optimized (2). Predict which parts of the frame can skip the most station bays.",
      "In lighting.cuh, change studentVisitBay. Press R to compile the edit, then V to compare the frozen image. Return to Beauty and measure GPU time at the same resolution."
    ],
    hint: "A ray may skip a bay when it misses the box enclosing all its architecture, or when the box is behind the closest known hit. Reuse the supplied ray–box test.",
    edit: "return bayIntersects(r, z, closest);"
  },
  creature: {
    title: "Sluice 09",
    session: "4/creature",
    placement: "After Week 4, Day 4 · 90 minutes",
    alt: "A wet mass of segmented worms passing beneath an industrial sluice gate",
    caption: "Trace a single worm along the edge of the mass and watch where it disappears behind another strand.",
    off: "Wet surface off",
    compare: "Look for two changes together: highlights along the worms and the reflected mass on the wet floor.",
    normals: "Color follows the direction of each visible segment’s surface. Trace the abrupt transitions where one strand passes in front of another.",
    film: "Watch the active strands crowd beneath the moving gate and spread out on the wet floor.",
    exercise: "Skip five hidden links at a time",
    question: "Can the ray reject a section of one worm while preserving its silhouette, shadow, and reflection?",
    steps: [
      "In the native viewer, change Gate opening and freeze a moment with strands crossing. Compare the wet surface with the dry version.",
      "Switch to Work and compare Reference (1) and Optimized (2). The reference already rejects entire worms that a ray cannot hit. Look for savings inside the surviving worms.",
      "Find studentVisitsGroup in creature.cuh. Add the five-link group test, press R, then V. Compare GPU time at two gate openings with the same camera and image settings."
    ],
    hint: "The group encloses five consecutive links of one worm. Pass the current closest distance to the existing intersection helper so a farther group can also be skipped.",
    edit: "return meets(r, bounds, closest);"
  },
  textile: {
    title: "Selvedge",
    session: "6/textile",
    placement: "After Week 6, Day 4 · 75 minutes",
    alt: "A knitted sleeve stretched around a marked ceramic form, with individual loops and frayed edges visible",
    caption: "Follow the loops along a torn edge. The ceramic markings make it easier to see where the fabric becomes translucent.",
    off: "Yarn shading off",
    compare: "Compare the highlights along the yarn and how much of the ceramic shows through the weave.",
    normals: "Inspect the large-scale curvature of the form and its mounting hardware. The beauty pass adds the small yarn and fiber shading.",
    film: "A scripted grab pulls the knit, leaves a tear, and releases the material. Try your own pull in the native viewer.",
    exercise: "Preserve the torn outline",
    question: "The yarn looks intricate, but how much geometry does a camera ray need to visit before shading even begins?",
    steps: [
      "In the native viewer, drag the knit, release it, and pause. Study where the open hole reveals the curved ceramic support.",
      "Inspect Work in Reference (1) and Optimized (2). Pick two areas with different intersection counts. Predict why one ray can skip more geometry groups.",
      "Edit studentVisit in textile.cuh. Press R to compile and V to compare a frozen frame. Change the camera angle and run the comparison again."
    ],
    hint: "Each conservative box encloses several surface pieces. Reject a group using the helper that compares its ray interval with the closest hit found so far.",
    edit: "return reaches(box, ray, closest);"
  },
  soundstage: {
    title: "Signal / Soundstage",
    session: "8/soundstage",
    placement: "Week 8 opener · Before Day 1 · 90 minutes",
    alt: "A studio-lit portable radio on a reflective plinth with highlights on the metal, speaker grille and controls",
    caption: "Follow a light across the radio’s housing. Compare its broad reflection on a rough surface with the tighter highlight on a metal fitting.",
    off: "Reflections off",
    compare: "Inspect the environment contribution on the radio and its reflection on the plinth. Direct lighting remains present on both sides.",
    normals: "Fine color changes expose the model’s normal map. The large, uniform area below the model is the plinth.",
    film: "The camera and the environment lighting move around the radio, revealing how its highlights vary with angle.",
    exercise: "Visit the nearer branch first",
    question: "Can changing the order of two bounding boxes save triangle tests on the same radio?",
    steps: [
      "Open the radio, move the Roughness slider, and watch the housing and metal controls respond. Freeze a camera angle before timing.",
      "Select Work and toggle between Reference (1) and Optimized (2). Both traverse a bounding-volume hierarchy, a tree of boxes enclosing groups of triangles.",
      "Edit studentNearFirst in soundstage.cuh. Press R, then V. Check a second angle and record both the work image and measured GPU time."
    ],
    hint: "When the right box begins closer than the left one, reverse their order. The stack pops the near box first, which can establish a close hit before visiting the farther branch.",
    edit: "return rightEntry < leftEntry;"
  }
};

const views = ["beauty", "compare", "normals", "film"];
const byId = id => document.getElementById(id);
const buttons = Array.from(document.querySelectorAll(".views button"));
const choices = Array.from(document.querySelectorAll(".scene-choice"));
const frame = byId("frame"), offFrame = byId("off-frame"), film = byId("film");
const stage = byId("stage"), wipe = byId("wipe"), mediaError = byId("media-error");
let currentScene = "", currentView = "";

function setSplit(value) {
  const split = Math.min(100, Math.max(0, Number(value)));
  wipe.value = String(split);
  wipe.setAttribute("aria-valuetext", split + "% feature off");
  stage.style.setProperty("--split", split + "%");
}

function setSource(element, file) {
  if (element.getAttribute("src") !== file) element.setAttribute("src", file);
}

function setMediaLink(file, label) {
  const link = byId("media-link");
  link.href = file;
  link.replaceChildren(label + " ", Object.assign(document.createElement("span"), {textContent: "↗"}));
  link.lastChild.setAttribute("aria-hidden", "true");
}

function fillWorksheet(id, scene) {
  const sessionLink = byId("session-link");
  sessionLink.href = "../../index.html#day/" + scene.session;
  sessionLink.setAttribute("aria-label", "Open the tracked session for " + scene.title);
  byId("session-placement").textContent = scene.placement;
  byId("manual-link").href = "manual.html#" + id;
  byId("worksheet-title").textContent = scene.exercise;
  byId("question").textContent = scene.question;
  const checks = {lighting:"gallery-lighting", creature:"worm-rays", textile:"gallery-cloth", soundstage:"radio-packet"};
  byId("scene-predictions").innerHTML = window.LabPredictions?.render([checks[id]], "gallery-"+id) || "";
  const source = byId("source-link");
  source.href = id + ".cuh";
  source.textContent = "Read " + id + ".cuh ↗";
  byId("practice").replaceChildren(...scene.steps.map(text => {
    const item = document.createElement("li");
    item.textContent = text;
    return item;
  }));
  byId("hint").open = false;
  byId("hint-copy").textContent = scene.hint;
  byId("edit-code").textContent = scene.edit;
  byId("check-command").textContent = "python -B labs/nightshift/nightshift.py --scene " + id + " --check";
}

function readRoute() {
  const parts = location.hash.slice(1).split("/");
  if (parts[0] && !Object.hasOwn(scenes, parts[0])) {
    if (currentScene) return; // An ordinary document anchor such as the skip link.
    parts[0] = "lighting";
  }
  const id = parts[0] || "lighting";
  const view = views.includes(parts[1]) ? parts[1] : "beauty";
  const scene = scenes[id];
  if (id === currentScene && view === currentView) return;
  const changed = id !== currentScene;
  currentScene = id;
  currentView = view;
  film.pause();
  mediaError.hidden = true;
  if (changed) {
    byId("scene-heading").textContent = scene.title;
    document.title = scene.title + " · Night Shift · Fieldwork";
    fillWorksheet(id, scene);
    setSplit(50);
  }
  const suffix = view === "beauty" ? "" : "/" + view;
  for (const choice of choices) {
    choice.href = "#" + choice.dataset.scene + suffix;
    if (choice.dataset.scene === id) choice.setAttribute("aria-current", "true");
    else choice.removeAttribute("aria-current");
  }
  for (const button of buttons) button.setAttribute("aria-pressed", String(button.dataset.view === view));
  const base = "media/" + id;
  stage.dataset.view = view;
  const compare = view === "compare", playing = view === "film";
  frame.hidden = playing;
  offFrame.hidden = !compare;
  wipe.hidden = !compare;
  byId("wipe-rule").hidden = !compare;
  byId("wipe-labels").hidden = !compare;
  byId("compare-help").hidden = !compare;
  film.hidden = !playing;
  byId("before-label").textContent = scene.off;
  if (playing) {
    film.poster = base + "-beauty.jpg";
    film.setAttribute("aria-label", scene.title + " film");
    setSource(film, base + ".mp4");
    setMediaLink(base + ".mp4", "Open MP4");
  } else {
    const image = base + (view === "normals" ? "-normals.jpg" : "-beauty.jpg");
    frame.alt = view === "normals" ? scene.title + " surface normals encoded in RGB" : scene.alt;
    setSource(frame, image);
    if (compare) setSource(offFrame, base + "-off.jpg");
    setMediaLink(compare ? base + "-off.jpg" : image, compare ? "Open feature-off still" : "Open still");
  }
  byId("caption").textContent = view === "beauty" ? scene.caption : scene[view];
}

for (const button of buttons) {
  button.addEventListener("click", () => {
    const next = button.dataset.view;
    location.hash = currentScene + (next === "beauty" ? "" : "/" + next);
  });
}
wipe.addEventListener("input", () => setSplit(wipe.value));
for (const item of [frame, offFrame, film]) {
  item.addEventListener("error", () => {
    if (item.hidden) return;
    mediaError.hidden = false;
    mediaError.textContent = item === film
      ? "This browser could not play the capture. Use Open MP4 to try another player."
      : "This capture could not be loaded. Check that the media folder is beside this gallery.";
  });
}
window.addEventListener("hashchange", readRoute);
readRoute();
