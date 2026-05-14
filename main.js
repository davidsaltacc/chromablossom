
window.numberButton = (id, value) => {
    const input = document.querySelector("#number-input-" + id); 
    const maxDigitsBefore = Math.max(parseFloat(input.value).toString().split(".")[1]?.length ?? 0, parseFloat(value).toString().split(".")[1]?.length ?? 0);
    input.value = parseFloat((parseFloat(input.value) + parseFloat(value)).toFixed(maxDigitsBefore));
    input.dispatchEvent(new Event("change"));
};

function setupNumberInput(id, getter, setter) {
    const input = document.querySelector("#number-input-" + id); 
    input.value = getter();
    input.onchange = () => {
        const newValue = parseFloat(input.value);
        if (Number.isFinite(newValue)) {
            setter(newValue);
        } else {
            input.value = getter();
        }
    };
}

function setupBoolButton(id, getter, setter) {
    const buttonOn = document.querySelector("#bool-button-" + id + "-on");
    const buttonOff = document.querySelector("#bool-button-" + id + "-off");
    if (getter()) {
        buttonOn.setAttribute("disabled", "");
        buttonOff.removeAttribute("disabled");
    } else {
        buttonOn.removeAttribute("disabled");
        buttonOff.setAttribute("disabled", "");
    }
    buttonOn.onclick = () => {
        buttonOn.setAttribute("disabled", "");
        buttonOff.removeAttribute("disabled");
        setter(true);
    };
    buttonOff.onclick = () => {
        buttonOn.removeAttribute("disabled");
        buttonOff.setAttribute("disabled", "");
        setter(false);
    };
}

const canvas = document.querySelector("#canvas");

document.querySelector("#drag-overlay").style.display = "none";

window.toggleCanvasVisibility = () => {
    if (canvas.style.display !== "none") {
        canvas.style.display = "none";
        document.querySelector("#save-draft-button").style.display = "none";
        document.querySelector("#open-preset-button").style.display = "none";
        document.querySelector("#toggle-canvas-button").classList.remove("canvas-is-visible");
        return false;
    } else {
        canvas.style.display = "";
        document.querySelector("#save-draft-button").style.display = "";
        document.querySelector("#open-preset-button").style.display = "";
        document.querySelector("#toggle-canvas-button").classList.add("canvas-is-visible");
        window.drawToCanvas();
        return true;
    }
}

setupCB(canvas).then(cbContext => {

    var mousePos = [ 0, 0 ];
    var mouseRightClicked = false;

    function updateMouseCoords(evt) {
        const rect = evt.target.getBoundingClientRect();
        mousePos[0] = (2 * (evt.clientX - rect.left) - canvas.clientWidth) / canvas.clientWidth;
        mousePos[1] = -(2 * (evt.clientY - rect.top) - canvas.clientHeight) / canvas.clientHeight;
        mousePos[0] = mousePos[0] / cbContext.getZoom() + cbContext.getCenter()[0];
        mousePos[1] = mousePos[1] / cbContext.getZoom() + cbContext.getCenter()[1];
    }

    function onZoom(evt) {
        evt.preventDefault();
        var z = Math.exp(-evt.deltaY / 500);
        updateMouseCoords(evt);
        cbContext.setCenter([
            mousePos[0] + (cbContext.getCenter()[0] - mousePos[0]) / z,
            mousePos[1] + (cbContext.getCenter()[1] - mousePos[1]) / z
        ]);
        cbContext.setZoom(cbContext.getZoom() * z);
        cbContext.drawToCanvas();
    }

    function mouseDown(evt) {
        if (evt.button == 2) {
            mouseRightClicked = true;
        }
        updateMouseCoords(evt);
    }

    function mouseUp(evt) {
        if (evt.button == 2) {
            mouseRightClicked = false;
        }
    }

    function mouseMove(evt) {
        if (mouseRightClicked) {
            const oldX = mousePos[0];
            const oldY = mousePos[1];
            updateMouseCoords(evt);
            cbContext.setCenter([
                cbContext.getCenter()[0] + oldX - mousePos[0],
                cbContext.getCenter()[1] + oldY - mousePos[1]
            ]);
            updateMouseCoords(evt);
            cbContext.drawToCanvas();
        }
    }

    canvas.onwheel = onZoom;
    canvas.onmousedown = mouseDown;
    document.onmouseup = mouseUp;
    canvas.onmousemove = mouseMove;
    canvas.oncontextmenu = evt => evt.preventDefault();

    window.saveDraft = () => {
        cbContext.drawToCanvas();
        var data = canvas.toDataURL("image/png");
        var a = document.createElement("a");
        a.href = data;
        a.download = "chromatic.blossom.preview.png";
        a.click();
        a.remove();
    }

    window.getPresetLink = () => {
        const url = new URL(window.location.href.split("?")[0]);
        url.searchParams.append("a", cbContext.getA().toString());
        url.searchParams.append("b", cbContext.getB().toString());
        url.searchParams.append("c", cbContext.getC().toString());
        url.searchParams.append("d", cbContext.getD().toString());
        url.searchParams.append("e", cbContext.getE().toString());
        url.searchParams.append("f", cbContext.getF().toString());
        url.searchParams.append("g", cbContext.getG().toString());
        url.searchParams.append("h", cbContext.getH().toString());
        url.searchParams.append("i", cbContext.getI().toString());
        url.searchParams.append("j", cbContext.getJ().toString());
        url.searchParams.append("it", cbContext.getMaxIterations().toString());
        url.searchParams.append("rd", cbContext.getRadius().toString());
        url.searchParams.append("sc", cbContext.getSampleCount().toString());
        url.searchParams.append("sk", cbContext.getSkeleton() ? "1" : "0");
        url.searchParams.append("kc", cbContext.getSkeletonClampFix() ? "1" : "0");
        url.searchParams.append("cx", cbContext.getCenter()[0].toString());
        url.searchParams.append("cy", cbContext.getCenter()[1].toString());
        url.searchParams.append("zm", cbContext.getZoom().toString());
        return url.href;
    };

    window.openPresetLink = () => {
        window.open(window.getPresetLink());
    }

    window.applyPreset = urlString => {
        const url = new URL(urlString);
        cbContext.setA(Number.parseFloat(url.searchParams.get("a") ?? cbContext.getA()));
        cbContext.setB(Number.parseFloat(url.searchParams.get("b") ?? cbContext.getB()));
        cbContext.setC(Number.parseFloat(url.searchParams.get("c") ?? cbContext.getC()));
        cbContext.setD(Number.parseFloat(url.searchParams.get("d") ?? cbContext.getD()));
        cbContext.setE(Number.parseFloat(url.searchParams.get("e") ?? cbContext.getE()));
        cbContext.setF(Number.parseFloat(url.searchParams.get("f") ?? cbContext.getF()));
        cbContext.setG(Number.parseFloat(url.searchParams.get("g") ?? cbContext.getG()));
        cbContext.setH(Number.parseFloat(url.searchParams.get("h") ?? cbContext.getH()));
        cbContext.setI(Number.parseFloat(url.searchParams.get("i") ?? cbContext.getI()));
        cbContext.setJ(Number.parseFloat(url.searchParams.get("j") ?? cbContext.getJ()));
        cbContext.setMaxIterations(Number.parseFloat(url.searchParams.get("it") ?? cbContext.getMaxIterations()));
        cbContext.setRadius(Number.parseFloat(url.searchParams.get("rd") ?? cbContext.getRadius()));
        cbContext.setSampleCount(Number.parseFloat(url.searchParams.get("sc") ?? cbContext.getSampleCount()));
        cbContext.setSkeleton((url.searchParams.get("sk") ?? (cbContext.getSkeleton() ? "1" : "0")) === "1");
        cbContext.setSkeletonClampFix((url.searchParams.get("kc") ?? (cbContext.getSkeletonClampFix() ? "1" : "0")) === "1");
        cbContext.setCenter([
            Number.parseFloat(url.searchParams.get("cx") ?? cbContext.getCenter()[0]),
            Number.parseFloat(url.searchParams.get("cy") ?? cbContext.getCenter()[1])
        ]);
        cbContext.setZoom(Number.parseFloat(url.searchParams.get("zm") ?? cbContext.getZoom()));
    };

    window.resetValues = () => {
        cbContext.setDefaultValues();
        window.updateUi();
        cbContext.drawToCanvas();
    };

    window.randomizeValues = () => {
        cbContext.setA(Number.parseFloat((((Math.random() - 0.5) * 2) * 4).toFixed(2)));
        cbContext.setB(Number.parseFloat((((Math.random() - 0.5) * 2) * 5).toFixed(2)));
        cbContext.setC(Number.parseFloat(Math.floor(((Math.random() - 0.5) * 2) * 10)));
        cbContext.setC(cbContext.getC() == 0 ? 1 : cbContext.getC());
        cbContext.setD(Number.parseFloat((((Math.random() - 0.5) * 2) * 15).toFixed(2)));
        cbContext.setE(Number.parseFloat((((Math.random() - 0.5) * 2) * 10).toFixed(2)));
        cbContext.setF(Number.parseFloat((((Math.random() - 0.5) * 2) * 6).toFixed(2)));
        cbContext.setG(Number.parseFloat(Math.floor(((Math.random() - 0.5) * 2) * 4) / 2));
        cbContext.setH(Number.parseFloat((((Math.random() - 0.5) * 2) * 5).toFixed(2)));
        cbContext.setI(Number.parseFloat((((Math.random() - 0.5) * 2) * 10).toFixed(2)));
        cbContext.setJ(Number.parseFloat((((Math.random() - 0.5) * 2) * 4).toFixed(2)));
        window.updateUi();
        cbContext.drawToCanvas();
    };

    const exportOptions = {
        resolution: [ 2000, 2000 ],
        chunked: true,
        chunkResolution: [ 500, 500 ],
        ssaa: true,
        embedPreset: true
    };

    window.exportHiRes = () => {
        if (confirm("Proceed with render?")) {
            document.querySelector("#export-overlay").style.display = "";
            requestAnimationFrame(async () => {
                const canvas2 = document.createElement("canvas");
                canvas2.width = exportOptions.resolution[0];
                canvas2.height = exportOptions.resolution[1];
                const ctx = canvas2.getContext("2d");
                const data = await cbContext.renderExport(
                    exportOptions.resolution,
                    exportOptions.ssaa,
                    exportOptions.chunked,
                    exportOptions.chunkResolution
                );
                if (data == null) {
                    document.querySelector("#export-overlay").style.display = "none";
                    return;
                }
                ctx.putImageData(data, 0, 0);

                const encoder = new TextEncoder();
                const canvasBlob = await new Promise(resolve => canvas2.toBlob(resolve, "image/png"));
                const urlBlob = new Blob([ encoder.encode("CHROMATIC.BLOSSOM.PRESET::" + window.getPresetLink()) ], { type: "text/plain" });
                const mergedBlob = exportOptions.embedPreset ? new Blob([ canvasBlob, urlBlob ], { type: "image/png" }) : canvasBlob;

                const dataUrl = URL.createObjectURL(mergedBlob);
                var a = document.createElement("a");
                a.href = dataUrl;
                a.download = "chromatic.blossom.png";
                a.click();
                a.remove();
                
                document.querySelector("#export-overlay").style.display = "none";
            });
        }
    };

    document.querySelector("#export-overlay").style.display = "none";

    document.querySelector("#import-url-text").value = "";

    document.querySelector("#import-url-button").onclick = () => {
        applyPreset(document.querySelector("#import-url-text").value);
        cbContext.drawToCanvas();
    };

    function loadPresetFromFile(file) {
        var reader = new FileReader();
        reader.readAsText(file, "UTF-8");
        reader.onload = readerEvent => {
            var content = readerEvent.target.result;
            var split = content.split("CHROMATIC.BLOSSOM.PRESET::");
            if (split.length >= 2) {
                window.applyPreset(split[split.length - 1]);
                cbContext.drawToCanvas();
            } else {
                alert("No preset found in image.");
            }
        }
    }

    document.querySelector("#import-file-button").onclick = () => {
        var input = document.createElement("input");
        input.type = "file";
        input.onchange = evt => { 

            var file = evt.target.files[0]; 
            loadPresetFromFile(file);

        }
        input.click();

    };

    window.ondragenter = event => {
        event.preventDefault();
        document.querySelector("#drag-overlay").style.display = "flex";
    };
    
    window.ondragover = event => {
        event.preventDefault();
    };
    
    window.ondragleave = event => {
        if (event.target == document.body || event.clientY <= 0) {
            document.querySelector("#drag-overlay").style.display = "none";
        }
    };

    window.ondrop = evt => {

        evt.preventDefault();
        document.querySelector("#drag-overlay").style.display = "none";
    
        var files = evt.dataTransfer.files;
    
        if (files.length) {
    
            loadPresetFromFile(files[0]);
    
        } else {
            evt.dataTransfer.items[0].getAsString(async text => {
                if (text.startsWith("http")) {
                    window.applyPreset(text);
                    cbContext.drawToCanvas();
                }
            });
        }

    };

    window.drawToCanvas = cbContext.drawToCanvas;

    window.applyPreset(window.location.href);
    cbContext.drawToCanvas();

    window.updateUi = () => {
        setupNumberInput("canvas-size-x", () => canvas.width, value => { canvas.width = Math.max(value, 1); if (canvas.style.display !== "none") { cbContext.drawToCanvas(); } });
        setupNumberInput("canvas-size-y", () => canvas.height, value => { canvas.height = Math.max(value, 1); if (canvas.style.display !== "none") { cbContext.drawToCanvas(); } });
        setupNumberInput("maximum-iterations", () => cbContext.getMaxIterations(), value => { cbContext.setMaxIterations(value); if (canvas.style.display !== "none") { cbContext.drawToCanvas(); } });
        setupNumberInput("sample-count", () => cbContext.getSampleCount(), value => { cbContext.setSampleCount(value); if (canvas.style.display !== "none") { cbContext.drawToCanvas(); } });
        setupNumberInput("radius", () => cbContext.getRadius(), value => { cbContext.setRadius(value); if (canvas.style.display !== "none") { cbContext.drawToCanvas(); } });
        setupNumberInput("a", () => cbContext.getA(), value => { cbContext.setA(value); if (canvas.style.display !== "none") { cbContext.drawToCanvas(); } });
        setupNumberInput("b", () => cbContext.getB(), value => { cbContext.setB(value); if (canvas.style.display !== "none") { cbContext.drawToCanvas(); } });
        setupNumberInput("c", () => cbContext.getC(), value => { cbContext.setC(value); if (canvas.style.display !== "none") { cbContext.drawToCanvas(); } });
        setupNumberInput("d", () => cbContext.getD(), value => { cbContext.setD(value); if (canvas.style.display !== "none") { cbContext.drawToCanvas(); } });
        setupNumberInput("e", () => cbContext.getE(), value => { cbContext.setE(value); if (canvas.style.display !== "none") { cbContext.drawToCanvas(); } });
        setupNumberInput("f", () => cbContext.getF(), value => { cbContext.setF(value); if (canvas.style.display !== "none") { cbContext.drawToCanvas(); } }); 
        setupNumberInput("g", () => cbContext.getG(), value => { cbContext.setG(value); if (canvas.style.display !== "none") { cbContext.drawToCanvas(); } }); 
        setupNumberInput("h", () => cbContext.getH(), value => { cbContext.setH(value); if (canvas.style.display !== "none") { cbContext.drawToCanvas(); } }); 
        setupNumberInput("i", () => cbContext.getI(), value => { cbContext.setI(value); if (canvas.style.display !== "none") { cbContext.drawToCanvas(); } }); 
        setupNumberInput("j", () => cbContext.getJ(), value => { cbContext.setJ(value); if (canvas.style.display !== "none") { cbContext.drawToCanvas(); } });
        setupBoolButton("skeleton", () => cbContext.getSkeleton(), value => { cbContext.setSkeleton(value); if (canvas.style.display !== "none") { cbContext.drawToCanvas(); } });
        setupBoolButton("skeleton-clamp-fix", () => cbContext.getSkeletonClampFix(), value => { cbContext.setSkeletonClampFix(value); if (canvas.style.display !== "none") { cbContext.drawToCanvas(); } });
        setupBoolButton("chunked", () => exportOptions.chunked, value => { exportOptions.chunked = value });
        setupBoolButton("ssaa", () => exportOptions.ssaa, value => { exportOptions.ssaa = value });
        setupBoolButton("embed-preset", () => exportOptions.embedPreset, value => { exportOptions.embedPreset = value });
        setupNumberInput("final-export-size-x", () => exportOptions.resolution[0], value => { exportOptions.resolution[0] = Math.max(value, 1); });
        setupNumberInput("final-export-size-y", () => exportOptions.resolution[1], value => { exportOptions.resolution[1] = Math.max(value, 1); });
        setupNumberInput("chunk-size-x", () => exportOptions.chunkResolution[0], value => { exportOptions.chunkResolution[0] = Math.max(value, 1); });
        setupNumberInput("chunk-size-y", () => exportOptions.chunkResolution[1], value => { exportOptions.chunkResolution[1] = Math.max(value, 1); });
    };

    window.updateUi();

    window.cbContext = cbContext;

});