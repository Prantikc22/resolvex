(function () {
  var script = document.currentScript;
  if (!script || document.getElementById("resolvex-launcher")) return;

  var origin = new URL(script.src).origin;
  var workspace = script.dataset.workspace || "";
  if (!workspace) {
    console.error("ResolveX: data-workspace is required.");
    return;
  }

  var launcher = document.createElement("button");
  launcher.id = "resolvex-launcher";
  launcher.type = "button";
  launcher.setAttribute("aria-label", "Open support messenger");

  var mark = document.createElement("span");
  Object.assign(mark.style, {
    display: "grid",
    width: "38px",
    height: "38px",
    gridTemplateColumns: "1fr 1fr",
    gap: "3px",
    borderRadius: "10px",
    background: "#101114",
    padding: "7px",
    color: "white",
    font: "700 15px system-ui, sans-serif",
    placeItems: "center",
    backgroundSize: "contain",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  });
  mark.innerHTML =
    '<i style="border-radius:2px;background:#c8ff73;width:100%;height:100%"></i><i style="border-radius:2px;background:#96d8ff;width:100%;height:100%"></i><i style="border-radius:2px;background:#ff735c;width:100%;height:100%"></i><i style="border-radius:2px;background:#fff;width:100%;height:100%"></i>';
  launcher.appendChild(mark);

  Object.assign(launcher.style, {
    position: "fixed",
    right: "24px",
    bottom: "24px",
    width: "64px",
    height: "64px",
    border: "1px solid rgba(255,255,255,.8)",
    borderRadius: "18px",
    background: "rgba(255,255,255,.96)",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    zIndex: "2147483647",
    boxShadow: "0 18px 48px rgba(20,24,35,.24)",
    backdropFilter: "blur(18px)",
    transition: "transform 140ms ease, box-shadow 180ms ease",
  });

  var frame = document.createElement("iframe");
  frame.id = "resolvex-frame";
  frame.title = "Support by ResolveX";
  frame.src =
    origin + "/widget/embed?workspace=" + encodeURIComponent(workspace);
  frame.allow = "clipboard-write; microphone";
  Object.assign(frame.style, {
    position: "fixed",
    right: "24px",
    bottom: "104px",
    width: "min(410px, calc(100vw - 24px))",
    height: "min(680px, calc(100vh - 128px))",
    border: "0",
    borderRadius: "22px",
    background: "transparent",
    zIndex: "2147483646",
    boxShadow: "0 30px 90px rgba(20,24,35,.24)",
    display: "none",
  });

  function setPosition(position) {
    var side = position === "left" ? "left" : "right";
    var opposite = side === "left" ? "right" : "left";
    launcher.style[side] = "24px";
    launcher.style[opposite] = "auto";
    frame.style[side] = "24px";
    frame.style[opposite] = "auto";
  }

  launcher.onpointerdown = function () {
    launcher.style.transform = "scale(.94)";
    if (navigator.vibrate) navigator.vibrate(8);
  };
  launcher.onpointerup = launcher.onpointercancel = function () {
    launcher.style.transform = "scale(1)";
  };
  launcher.onclick = function () {
    var opening = frame.style.display === "none";
    frame.style.display = opening ? "block" : "none";
    launcher.setAttribute(
      "aria-label",
      opening ? "Close support messenger" : "Open support messenger",
    );
  };

  setPosition("right");
  document.body.appendChild(frame);
  document.body.appendChild(launcher);

  fetch(origin + "/api/widget/config?key=" + encodeURIComponent(workspace), {
    mode: "cors",
    credentials: "omit",
  })
    .then(function (response) {
      if (!response.ok) throw new Error("Messenger unavailable");
      return response.json();
    })
    .then(function (config) {
      setPosition(config.position);
      launcher.style.borderColor = config.accent || "#ff5c35";
      launcher.setAttribute(
        "aria-label",
        "Open " + (config.agent || "support") + " messenger",
      );
      frame.title = (config.agent || "Support") + " from " + config.name;
      if (config.logoUrl) {
        mark.innerHTML = "";
        mark.style.backgroundColor = "white";
        mark.style.backgroundImage =
          'url("' + config.logoUrl.replace(/"/g, "%22") + '")';
      }
    })
    .catch(function () {
      launcher.title = "Messenger configuration is not available";
    });
})();
