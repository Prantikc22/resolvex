(function () {
  var script = document.currentScript;
  if (!script || document.getElementById("resolvex-launcher")) return;
  var origin = new URL(script.src).origin;
  var workspace = script.dataset.workspace || "default";

  var launcher = document.createElement("button");
  launcher.id = "resolvex-launcher";
  launcher.setAttribute("aria-label", "Open support messenger");
  launcher.innerHTML = '<span style="display:grid;width:38px;height:38px;grid-template-columns:1fr 1fr;gap:3px;border-radius:10px;background:#101114;padding:7px"><i style="border-radius:2px;background:#c8ff73"></i><i style="border-radius:2px;background:#96d8ff"></i><i style="border-radius:2px;background:#ff735c"></i><i style="border-radius:2px;background:#fff"></i></span>';
  Object.assign(launcher.style, { position: "fixed", right: "24px", bottom: "24px", width: "60px", height: "60px", border: "1px solid rgba(255,255,255,.8)", borderRadius: "15px", background: "rgba(255,255,255,.94)", display: "grid", placeItems: "center", cursor: "pointer", zIndex: "2147483647", boxShadow: "0 18px 48px rgba(20,24,35,.24)", backdropFilter: "blur(18px)" });

  var frame = document.createElement("iframe");
  frame.title = "Arlo support by ResolveX";
  frame.src = origin + "/widget/embed?workspace=" + encodeURIComponent(workspace);
  frame.allow = "clipboard-write; microphone";
  Object.assign(frame.style, { position: "fixed", right: "24px", bottom: "96px", width: "min(410px, calc(100vw - 24px))", height: "min(680px, calc(100vh - 120px))", border: "0", borderRadius: "10px", background: "transparent", zIndex: "2147483646", boxShadow: "0 30px 90px rgba(20,24,35,.24)", display: "none" });

  launcher.onclick = function () { frame.style.display = frame.style.display === "none" ? "block" : "none"; };
  document.body.appendChild(frame);
  document.body.appendChild(launcher);
})();
