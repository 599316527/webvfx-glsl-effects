
let transitions = [];
let canvasSize = {};
let imageData = {};

let $transitionNameSelect = $('#transition-name');

let $canvasWidthInput = $('#canvas-width');
let $canvasHeightInput = $('#canvas-height');

let $fromImageInput = $('#from-image');
let $toImageInput = $('#to-image');

let $playProgress = $('#progress');

let $canvas = $('#canvas');

$.getJSON('transitions.json', function (data) {
    transitions = data;
    let options = transitions.map(({name}, index) => `<option value="${index}" ${index === 35 ? 'selected' : ''}>${name}</option>`).join('');
    $transitionNameSelect.html(options);
});

$canvasWidthInput.on('change', function () {
    canvasSize.width = parseInt(this.value, 10);
    handleCanvasSizeChange();
}).trigger('change');
$canvasHeightInput.on('change', function () {
    canvasSize.height = parseInt(this.value, 10);
    handleCanvasSizeChange();
}).trigger('change');
function handleCanvasSizeChange() {
    $canvas.attr(canvasSize);
    $('.canvas').css('width', canvasSize.width + 'px');
}

$fromImageInput.on('change', async function () {
    let image = this.files[0];
    if (!image) {
        image = this.dataset.placeholder;
    }
    imageData.from = await getImageData(image);
    this.value = '';
}).trigger('change');
$toImageInput.on('change', async function () {
    let image = this.files[0];
    if (!image) {
        image = this.dataset.placeholder;
    }
    imageData.to = await getImageData(image);
    this.value = '';
}).trigger('change');


async function getImageData(image) {
    let img = new Image();
    let loadPromise = new Promise(function (resolve) {
        img.onload = resolve;
    });
    if (image instanceof Blob) {
        img.src = URL.createObjectURL(image);
    }
    else {
        img.src = image;
    }
    let $canvas = $('<canvas>').attr(canvasSize);
    // $canvas.appendTo('body');
    let context = $canvas[0].getContext('2d');
    await loadPromise;
    context.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, canvasSize.width, canvasSize.height);
    return context.getImageData(0, 0, canvasSize.width, canvasSize.height);
}

let shader;
function updateShader() {
    let transition = transitions[$transitionNameSelect.val()];
    let renderer = new ShaderKit.Renderer($canvas[0]);
    shader = new ShaderKit.Shader(renderer, transition.glsl);
    // let easeCurl = new WebVfx.Easing.Sinusoidal(0, 1, 1);
    shader.updateUniform("progress", 0);
    shader.updateUniform("from", imageData.from);
    shader.updateUniform("to", imageData.to);
    shader.updateUniform("resolution", [canvasSize.width, canvasSize.height]);

    Object.entries(transition.uniforms).forEach(function ([key, value]) {
        shader.updateUniform(key, value);
    });

    shader.renderer.render(shader);
}

function updateShaderProgress() {
    updateShaderProgressByValue($playProgress.val() / 100);
}
function updateShaderProgressByValue(value) {
    if (!shader) return;
    shader.updateUniform("progress", value);
    shader.renderer.render(shader);
}
$playProgress
    .on('change', updateShaderProgress)
    .on('mousedown', function () {
        $(document).on('mousemove', updateShaderProgress);
    })
    .on('mouseup', function () {
        $(document).off('mousemove', updateShaderProgress);
    })

$('#canvas-play-btn').on('click', function () {
    this.disabled = true;
    let me = this;
    let duration = parseInt($('#canvas-duration').val(), 10) * 1000;
    if (!duration) return;

    let startTime;
    function step(timestamp) {
        if (!startTime) startTime = timestamp;
        let progress = Math.min((timestamp - startTime) / duration, 1);
        $playProgress.val(progress * 100);
        updateShaderProgressByValue(progress);
        if (progress < 1) {
            requestAnimationFrame(step);
        }
        else {
            done()
        }
    }
    requestAnimationFrame(step);

    function done() {
        me.disabled = false;
        let tmp = imageData.to;
        imageData.to = imageData.from;
        imageData.from = tmp;
        shader.updateUniform("from", imageData.from);
        shader.updateUniform("to", imageData.to);

        $playProgress.val(0);
    }
});




