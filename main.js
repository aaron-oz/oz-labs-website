/**
 * OZ Labs - Main JavaScript
 *
 * Background visualizers:
 *   - NightSkyVisualizer: Log-Gaussian Cox process starfield (homepage)
 *   - SpatialGPVisualizer: Spatio-temporal GP heatmap (services: spacetime tab)
 *   - NetworkVisualizer: Hawkes-process network (services: stats tab)
 *   - WireframeVisualizer: Stochastic layout evolution (services: web tab)
 *   - DataShapeVisualizer: Kernel density morphing (services: dataviz tab)
 */

// ============================================
// Shared color palettes
// ============================================

const COLOR_PALETTES = {
    cyberpunk: {
        name: 'Cyberpunk',
        colors: [
            { r: 0, g: 240, b: 255 },
            { r: 168, g: 85, b: 247 },
            { r: 255, g: 0, b: 255 },
            { r: 0, g: 255, b: 136 },
        ]
    },
    ocean: {
        name: 'Ocean',
        colors: [
            { r: 34, g: 211, b: 238 },
            { r: 99, g: 102, b: 241 },
            { r: 59, g: 130, b: 246 },
            { r: 16, g: 185, b: 129 },
        ]
    },
    thermal: {
        name: 'Thermal',
        colors: [
            { r: 255, g: 220, b: 80 },
            { r: 220, g: 50, b: 80 },
            { r: 255, g: 140, b: 50 },
            { r: 180, g: 20, b: 120 },
        ]
    },
    forest: {
        name: 'Forest',
        colors: [
            { r: 34, g: 197, b: 94 },
            { r: 144, g: 238, b: 144 },
            { r: 16, g: 185, b: 129 },
            { r: 74, g: 222, b: 128 },
        ]
    },
    viridis: {
        name: 'Viridis',
        colors: [
            { r: 68, g: 1, b: 84 },
            { r: 33, g: 145, b: 140 },
            { r: 94, g: 201, b: 98 },
            { r: 253, g: 231, b: 37 },
        ]
    },
    magma: {
        name: 'Magma',
        colors: [
            { r: 81, g: 18, b: 124 },
            { r: 183, g: 55, b: 121 },
            { r: 252, g: 137, b: 97 },
            { r: 252, g: 253, b: 191 },
        ]
    },
};

// GP colormap stops for SpatialGPVisualizer
const GP_COLORMAPS = {
    cyberpunk: [{r:6,g:6,b:12},{r:20,g:0,b:60},{r:0,g:180,b:255},{r:255,g:0,b:255},{r:0,g:255,b:136}],
    ocean: [{r:10,g:10,b:35},{r:30,g:60,b:150},{r:99,g:102,b:241},{r:34,g:211,b:238},{r:200,g:240,b:255}],
    thermal: [{r:15,g:10,b:50},{r:120,g:20,b:60},{r:220,g:50,b:80},{r:255,g:180,b:60},{r:255,g:240,b:140}],
    forest: [{r:10,g:25,b:20},{r:20,g:80,b:50},{r:34,g:139,b:84},{r:100,g:200,b:120},{r:180,g:255,b:180}],
    viridis: [{r:68,g:1,b:84},{r:59,g:82,b:139},{r:33,g:145,b:140},{r:94,g:201,b:98},{r:253,g:231,b:37}],
    magma: [{r:0,g:0,b:4},{r:81,g:18,b:124},{r:183,g:55,b:121},{r:252,g:137,b:97},{r:252,g:253,b:191}],
};


// ============================================
// Base Visualizer
// ============================================

class BaseVisualizer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.animationId = null;
        this.paused = false;
        this.startTime = performance.now();
        this.time = 0;
        this.lastFrameTime = 0;
        this.resize();
        this._resizeHandler = () => this.resize();
        window.addEventListener('resize', this._resizeHandler);
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.canvas.style.width = window.innerWidth + 'px';
        this.canvas.style.height = window.innerHeight + 'px';
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.width = window.innerWidth;
        this.height = window.innerHeight;
    }

    animate() {
        if (this.paused) return;
        const now = performance.now();
        this.time = now - this.startTime;
        const dt = Math.min(now - this.lastFrameTime, 50); // cap dt to avoid jumps
        this.lastFrameTime = now;
        this.render(dt);
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    pause() {
        this.paused = true;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    resume() {
        if (!this.paused) return;
        this.paused = false;
        this.startTime = performance.now() - this.time;
        this.lastFrameTime = performance.now();
        this.animate();
    }

    start() {
        this.paused = false;
        this.startTime = performance.now();
        this.lastFrameTime = performance.now();
        this.time = 0;
        this.animate();
    }

    stop() {
        this.pause();
        window.removeEventListener('resize', this._resizeHandler);
    }

    render(dt) {}

    destroy() { this.stop(); }

    // Build param controls UI
    buildControls(containerId, labelId, config) {
        const container = document.getElementById(containerId);
        const label = document.getElementById(labelId);
        if (!container || !label) return;

        label.textContent = config.label;
        const paramsDiv = document.getElementById('viz-params');
        if (!paramsDiv) return;
        paramsDiv.innerHTML = '';

        for (const param of config.params) {
            const wrapper = document.createElement('div');
            wrapper.className = 'viz-param';

            if (param.type === 'select') {
                const lbl = document.createElement('label');
                lbl.textContent = param.label;
                const sel = document.createElement('select');
                for (const opt of param.options) {
                    const o = document.createElement('option');
                    o.value = opt.value;
                    o.textContent = opt.label;
                    if (opt.value === param.value) o.selected = true;
                    sel.appendChild(o);
                }
                sel.addEventListener('change', () => param.onChange(sel.value));
                wrapper.appendChild(lbl);
                wrapper.appendChild(sel);
            } else if (param.type === 'range') {
                const lbl = document.createElement('label');
                lbl.textContent = param.label;
                const inp = document.createElement('input');
                inp.type = 'range';
                inp.min = param.min;
                inp.max = param.max;
                inp.step = param.step || 'any';
                inp.value = param.value;
                inp.addEventListener('input', () => param.onChange(parseFloat(inp.value)));
                wrapper.appendChild(lbl);
                wrapper.appendChild(inp);
            }

            paramsDiv.appendChild(wrapper);
        }
    }
}


// ============================================
// Night Sky Visualizer (Cox Process)
// Homepage background
// ============================================

class NightSkyVisualizer extends BaseVisualizer {
    constructor(canvas) {
        super(canvas);
        this.fieldGridSize = 20;
        this.fieldSeeds = [];
        this.fieldTimeScale = 0.0003;
        this.maxStars = 300;
        this.stars = [];
        this.spawnTimer = 0;
        this.starTypes = ['dot', 'dot', 'dot', 'glow', 'glow', 'cross', 'sparkle'];
        this.starColors = [
            { r: 255, g: 255, b: 255 },
            { r: 255, g: 255, b: 255 },
            { r: 255, g: 255, b: 255 },
            { r: 200, g: 220, b: 255 },
            { r: 200, g: 220, b: 255 },
            { r: 0, g: 240, b: 255 },
            { r: 168, g: 85, b: 247 },
            { r: 255, g: 0, b: 255 },
            { r: 0, g: 255, b: 136 },
        ];
        this.initField();
        this.seedInitialStars();
        this.start();
    }

    initField() {
        this.fieldSeeds = [];
        for (let i = 0; i <= this.fieldGridSize; i++) {
            this.fieldSeeds[i] = [];
            for (let j = 0; j <= this.fieldGridSize; j++) {
                this.fieldSeeds[i][j] = Math.random() * Math.PI * 2;
            }
        }
    }

    sampleIntensity(x, y) {
        const nx = (x / this.width) * this.fieldGridSize;
        const ny = (y / this.height) * this.fieldGridSize;
        const t = this.time * this.fieldTimeScale;
        const xi = Math.floor(nx), yi = Math.floor(ny);
        const xf = nx - xi, yf = ny - yi;
        const s = t => t * t * t * (t * (t * 6 - 15) + 10);
        const sx = s(xf), sy = s(yf);
        const get = (i, j) => {
            const ii = Math.max(0, Math.min(this.fieldGridSize, i));
            const jj = Math.max(0, Math.min(this.fieldGridSize, j));
            return Math.sin(this.fieldSeeds[ii][jj] + t);
        };
        const nx0 = get(xi, yi) * (1 - sx) + get(xi + 1, yi) * sx;
        const nx1 = get(xi, yi + 1) * (1 - sx) + get(xi + 1, yi + 1) * sx;
        return Math.exp((nx0 * (1 - sy) + nx1 * sy) * 1.5);
    }

    seedInitialStars() {
        for (let i = 0; i < 150; i++) this.spawnStar(Math.random() * 0.8 + 0.1);
    }

    spawnStar(phase = 0) {
        for (let attempt = 0; attempt < 10; attempt++) {
            const x = Math.random() * this.width;
            const y = Math.random() * this.height;
            if (Math.random() < this.sampleIntensity(x, y) / Math.E) {
                this.stars.push({
                    x, y,
                    type: this.starTypes[Math.floor(Math.random() * this.starTypes.length)],
                    color: this.starColors[Math.floor(Math.random() * this.starColors.length)],
                    size: 0.5 + Math.random() * 2.5,
                    lifetime: 3000 + Math.random() * 8000,
                    age: phase * (3000 + Math.random() * 8000),
                    twinkleSpeed: 0.5 + Math.random() * 2,
                    twinklePhase: Math.random() * Math.PI * 2,
                });
                return;
            }
        }
    }

    render(dt) {
        this.ctx.fillStyle = '#06060c';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.spawnTimer += dt;
        if (this.spawnTimer > 50 && this.stars.length < this.maxStars) {
            this.spawnStar();
            this.spawnTimer = 0;
        }

        for (let i = this.stars.length - 1; i >= 0; i--) {
            const star = this.stars[i];
            star.age += dt;
            if (star.age >= star.lifetime) { this.stars.splice(i, 1); continue; }

            const lp = star.age / star.lifetime;
            const envelope = lp < 0.15 ? lp / 0.15 : lp > 0.75 ? (1 - lp) / 0.25 : 1;
            const twinkle = 0.5 + 0.5 * Math.sin(star.age * star.twinkleSpeed * 0.005 + star.twinklePhase);
            const alpha = envelope * (0.3 + 0.7 * twinkle);
            const { r, g, b } = star.color;

            if (star.type === 'dot') {
                this.ctx.beginPath();
                this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
                this.ctx.fill();
            } else if (star.type === 'glow') {
                const grad = this.ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.size * 4);
                grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
                grad.addColorStop(0.3, `rgba(${r},${g},${b},${alpha * 0.4})`);
                grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
                this.ctx.fillStyle = grad;
                this.ctx.fillRect(star.x - star.size * 4, star.y - star.size * 4, star.size * 8, star.size * 8);
            } else if (star.type === 'cross') {
                const len = star.size * 3;
                this.ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.8})`;
                this.ctx.lineWidth = 0.8;
                this.ctx.beginPath();
                this.ctx.moveTo(star.x - len, star.y); this.ctx.lineTo(star.x + len, star.y);
                this.ctx.moveTo(star.x, star.y - len); this.ctx.lineTo(star.x, star.y + len);
                this.ctx.stroke();
                this.ctx.beginPath();
                this.ctx.arc(star.x, star.y, star.size * 0.6, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
                this.ctx.fill();
            } else if (star.type === 'sparkle') {
                const len = star.size * 3.5, dl = len * 0.5;
                this.ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.7})`;
                this.ctx.lineWidth = 0.6;
                this.ctx.beginPath();
                this.ctx.moveTo(star.x - len, star.y); this.ctx.lineTo(star.x + len, star.y);
                this.ctx.moveTo(star.x, star.y - len); this.ctx.lineTo(star.x, star.y + len);
                this.ctx.moveTo(star.x - dl, star.y - dl); this.ctx.lineTo(star.x + dl, star.y + dl);
                this.ctx.moveTo(star.x + dl, star.y - dl); this.ctx.lineTo(star.x - dl, star.y + dl);
                this.ctx.stroke();
                this.ctx.beginPath();
                this.ctx.arc(star.x, star.y, star.size * 0.5, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
                this.ctx.fill();
            }
        }

        // Vignette
        const grad = this.ctx.createRadialGradient(this.width/2, this.height/2, 0, this.width/2, this.height/2, Math.max(this.width, this.height) * 0.7);
        grad.addColorStop(0, 'rgba(6,6,12,0)');
        grad.addColorStop(1, 'rgba(6,6,12,0.3)');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }
}


// ============================================
// Spatio-Temporal GP Visualizer
// Services: spacetime tab
// ============================================

class SpatialGPVisualizer extends BaseVisualizer {
    constructor(canvas) {
        super(canvas);
        this.gridSize = 60;
        this.lengthScale = 0.5;
        this.timeScale = 0.0006;
        this.noiseSeeds = [];
        this.palette = 'cyberpunk';
        this.fadeIn = 1.0;

        this.initializeNoiseSeeds();
        this.cellWidth = this.width / this.gridSize;
        this.cellHeight = this.height / this.gridSize;
        this.start();
    }

    resize() {
        super.resize();
        this.cellWidth = this.width / this.gridSize;
        this.cellHeight = this.height / this.gridSize;
    }

    initializeNoiseSeeds() {
        this.noiseSeeds = [];
        for (let layer = 0; layer < 3; layer++) {
            this.noiseSeeds[layer] = [];
            for (let i = 0; i <= this.gridSize; i++) {
                this.noiseSeeds[layer][i] = [];
                for (let j = 0; j <= this.gridSize; j++) {
                    this.noiseSeeds[layer][i][j] = Math.random() * Math.PI * 2;
                }
            }
        }
    }

    smoothNoise(x, y, layer, timeOffset = 0) {
        const seeds = this.noiseSeeds[layer];
        const xi = Math.floor(x), yi = Math.floor(y);
        const xf = x - xi, yf = y - yi;
        const s = t => t * t * t * (t * (t * 6 - 15) + 10);
        const sx = s(xf), sy = s(yf);
        const t = this.time * this.timeScale + timeOffset;
        const val = (i, j) => {
            const ii = Math.max(0, Math.min(this.gridSize, i));
            const jj = Math.max(0, Math.min(this.gridSize, j));
            return Math.sin(seeds[ii][jj] + t * (1 + layer * 0.5));
        };
        const nx0 = val(xi, yi) * (1 - sx) + val(xi + 1, yi) * sx;
        const nx1 = val(xi, yi + 1) * (1 - sx) + val(xi + 1, yi + 1) * sx;
        return nx0 * (1 - sy) + nx1 * sy;
    }

    sampleGP(x, y) {
        const nx = (x / this.width) * this.gridSize;
        const ny = (y / this.height) * this.gridSize;
        let value = 0, amp = 1, freq = 1, maxAmp = 0;
        for (let o = 0; o < 3; o++) {
            value += amp * this.smoothNoise(nx * freq / (this.lengthScale * 10), ny * freq / (this.lengthScale * 10), o, o * 0.3);
            maxAmp += amp; amp *= 0.5; freq *= 2;
        }
        return value / maxAmp;
    }

    valueToColor(value) {
        const t = (value + 1) / 2;
        const stops = GP_COLORMAPS[this.palette] || GP_COLORMAPS.cyberpunk;
        const n = stops.length;
        const st = t * (n - 1);
        const i = Math.floor(st);
        const f = st - i;
        const c1 = stops[Math.min(i, n - 1)];
        const c2 = stops[Math.min(i + 1, n - 1)];
        return `rgb(${Math.round(c1.r + (c2.r - c1.r) * f)},${Math.round(c1.g + (c2.g - c1.g) * f)},${Math.round(c1.b + (c2.b - c1.b) * f)})`;
    }

    setupControls() {
        this.buildControls('viz-controls', 'viz-label', {
            label: 'Displayed: Cyclical Spatio-Temporal Gaussian Process',
            params: [
                {
                    type: 'select', label: 'Colors:', value: this.palette,
                    options: Object.keys(GP_COLORMAPS).map(k => ({ value: k, label: GP_COLORMAPS[k] ? k.charAt(0).toUpperCase() + k.slice(1) : k })),
                    onChange: v => { this.palette = v; }
                },
                {
                    type: 'range', label: 'Spatial Corr:', min: 0.15, max: 1.5, step: 0.05, value: this.lengthScale,
                    onChange: v => { this.lengthScale = v; }
                },
                {
                    type: 'range', label: 'Temporal Corr:', min: 0.0005, max: 0.0027, step: 0.0001, value: this.timeScale,
                    onChange: v => { this.timeScale = v; }
                },
            ]
        });
    }

    render(dt) {
        this.ctx.fillStyle = '#0a0a0f';
        this.ctx.fillRect(0, 0, this.width, this.height);

        const overlap = 1;
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                const x = i * this.cellWidth, y = j * this.cellHeight;
                this.ctx.fillStyle = this.valueToColor(this.sampleGP(x + this.cellWidth / 2, y + this.cellHeight / 2));
                this.ctx.fillRect(x - overlap, y - overlap, this.cellWidth + overlap * 2, this.cellHeight + overlap * 2);
            }
        }

        // Vignette
        const grad = this.ctx.createRadialGradient(this.width/2, this.height/2, 0, this.width/2, this.height/2, Math.max(this.width, this.height) * 0.7);
        grad.addColorStop(0, 'rgba(10,10,15,0)');
        grad.addColorStop(1, 'rgba(10,10,15,0.4)');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Fade-in
        if (this.fadeIn > 0) {
            this.fadeIn = Math.max(0, this.fadeIn - 0.008);
            this.ctx.fillStyle = `rgba(6,6,12,${this.fadeIn})`;
            this.ctx.fillRect(0, 0, this.width, this.height);
        }
    }
}


// ============================================
// Network Visualizer (Hawkes Process)
// Services: stats tab
// ============================================

class NetworkVisualizer extends BaseVisualizer {
    constructor(canvas) {
        super(canvas);
        this.nodes = [];
        this.edges = [];
        this.packets = [];
        this.palette = 'cyberpunk';
        this.birthRate = 0.3;
        this.deathRate = 0.15;
        this.packetRate = 0.3;
        this.selfExcitation = 0.4;
        this.connectRadius = 0.22; // fraction of min(w,h)
        this.fadeIn = 1.0;
        this._edgeMap = new Map(); // stable edge lookup
        this._birthTimer = 0;
        this._deathTimer = 0;
        this.maxNodes = 120;
        this.minNodes = 3;

        this.initNetwork();
        this.start();
    }

    getColors() {
        return (COLOR_PALETTES[this.palette] || COLOR_PALETTES.cyberpunk).colors;
    }

    initNetwork() {
        this.nodes = [];
        this.edges = [];
        this.packets = [];
        this._edgeMap = new Map();
        const colors = this.getColors();
        const initialCount = 40;

        for (let i = 0; i < initialCount; i++) {
            this.spawnNode();
        }

        this.rebuildEdges();
    }

    spawnNode() {
        const colors = this.getColors();
        this.nodes.push({
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            vx: (Math.random() - 0.5) * 0.25,
            vy: (Math.random() - 0.5) * 0.25,
            radius: 2 + Math.random() * 4,
            pulsePhase: Math.random() * Math.PI * 2,
            pulseSpeed: 0.5 + Math.random() * 1.5,
            color: colors[Math.floor(Math.random() * colors.length)],
            heat: 0,
            fadeAlpha: 0, // fade in from 0
        });
    }

    nodeHasPackets(nodeIdx) {
        return this.packets.some(p => p.edgeA === nodeIdx || p.edgeB === nodeIdx);
    }

    killNode(idx) {
        // Remove the node, reindex edges and packets
        this.nodes.splice(idx, 1);
        // Packets referencing this node or higher indices need reindexing
        this.packets = this.packets.filter(p => {
            if (p.edgeA === idx || p.edgeB === idx) return false;
            if (p.edgeA > idx) p.edgeA--;
            if (p.edgeB > idx) p.edgeB--;
            p.edgeKey = this._edgeKey(p.edgeA, p.edgeB);
            return true;
        });
        this.rebuildEdges();
    }

    _edgeKey(i, j) { return i < j ? `${i}-${j}` : `${j}-${i}`; }

    rebuildEdges() {
        const maxDist = Math.min(this.width, this.height) * this.connectRadius;
        const newMap = new Map();

        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const dx = this.nodes[i].x - this.nodes[j].x;
                const dy = this.nodes[i].y - this.nodes[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < maxDist) {
                    const key = this._edgeKey(i, j);
                    const existing = this._edgeMap.get(key);
                    // Preserve traffic and alpha from existing edges for smooth transitions
                    const traffic = existing ? existing.traffic : 0;
                    const edgeAlpha = existing ? existing.edgeAlpha : 1;
                    newMap.set(key, { a: i, b: j, dist, traffic, edgeAlpha, fadingOut: false });
                }
            }
        }

        // Edges that disappeared: keep them briefly for smooth fadeout
        for (const [key, edge] of this._edgeMap) {
            if (!newMap.has(key) && edge.edgeAlpha > 0.01) {
                edge.fadingOut = true;
                newMap.set(key, edge);
            }
        }

        this._edgeMap = newMap;
        this.edges = Array.from(newMap.values());

        // Clean up packets on dead edges
        const validKeys = new Set(newMap.keys());
        this.packets = this.packets.filter(p => validKeys.has(p.edgeKey));
    }

    spawnPacket(edge, direction) {
        const key = this._edgeKey(edge.a, edge.b);
        this.packets.push({
            edgeKey: key,
            edgeA: edge.a,
            edgeB: edge.b,
            progress: direction > 0 ? 0 : 1,
            speed: (0.0003 + Math.random() * 0.0003) * direction,
            color: this.getColors()[Math.floor(Math.random() * this.getColors().length)],
            // Store snapshot of start positions for smooth interpolation
            startAx: this.nodes[edge.a].x, startAy: this.nodes[edge.a].y,
            startBx: this.nodes[edge.b].x, startBy: this.nodes[edge.b].y,
        });
        edge.traffic = Math.min(edge.traffic + 0.3, 1);
    }

    resize() {
        super.resize();
        if (this.nodes && this.nodes.length) this.initNetwork();
    }

    setupControls() {
        this.buildControls('viz-controls', 'viz-label', {
            label: 'Displayed: Self-Exciting Hawkes Process on Network',
            params: [
                {
                    type: 'select', label: 'Colors:', value: this.palette,
                    options: Object.keys(COLOR_PALETTES).map(k => ({ value: k, label: COLOR_PALETTES[k].name })),
                    onChange: v => { this.palette = v; const c = this.getColors(); this.nodes.forEach(n => n.color = c[Math.floor(Math.random() * c.length)]); }
                },
                {
                    type: 'range', label: 'Birth Rate:', min: 0, max: 1, step: 0.05, value: this.birthRate,
                    onChange: v => { this.birthRate = v; }
                },
                {
                    type: 'range', label: 'Death Rate:', min: 0, max: 1, step: 0.05, value: this.deathRate,
                    onChange: v => { this.deathRate = v; }
                },
                {
                    type: 'range', label: 'Packet Rate:', min: 0.05, max: 1, step: 0.05, value: this.packetRate,
                    onChange: v => { this.packetRate = v; }
                },
                {
                    type: 'range', label: 'Self-Excitation:', min: 0, max: 3, step: 0.05, value: this.selfExcitation,
                    onChange: v => { this.selfExcitation = v; }
                },
            ]
        });
    }

    render(dt) {
        this.ctx.fillStyle = '#06060c';
        this.ctx.fillRect(0, 0, this.width, this.height);

        const t = this.time * 0.001;

        // Move nodes and fade in
        for (let ni = 0; ni < this.nodes.length; ni++) {
            const node = this.nodes[ni];
            if (node.fadeAlpha !== undefined && node.fadeAlpha < 1) {
                node.fadeAlpha = Math.min(1, node.fadeAlpha + dt * 0.008);
            }
            node.x += node.vx;
            node.y += node.vy;
            if (node.x < 0 || node.x > this.width) node.vx *= -1;
            if (node.y < 0 || node.y > this.height) node.vy *= -1;
            node.x = Math.max(0, Math.min(this.width, node.x));
            node.y = Math.max(0, Math.min(this.height, node.y));

            // Decay heat
            node.heat = Math.max(0, node.heat - dt * 0.0005);

            // Hawkes: excited nodes spawn packets
            if (node.heat > 0.1 && Math.random() < node.heat * this.selfExcitation * dt * 0.002) {
                const connected = this.edges.filter(e => !e.fadingOut && (e.a === ni || e.b === ni));
                if (connected.length > 0) {
                    const edge = connected[Math.floor(Math.random() * connected.length)];
                    this.spawnPacket(edge, edge.a === ni ? 1 : -1);
                }
            }
        }

        // Birth-death process
        this._birthTimer += dt;
        this._deathTimer += dt;
        const birthInterval = 800 / (this.birthRate + 0.01);
        const deathInterval = 800 / (this.deathRate + 0.01);
        if (this._birthTimer > birthInterval && this.nodes.length < this.maxNodes) {
            this._birthTimer = 0;
            this.spawnNode();
            this.rebuildEdges();
        }
        if (this._deathTimer > deathInterval && this.nodes.length > this.minNodes) {
            this._deathTimer = 0;
            // Pick a random node that has no active packets
            const candidates = [];
            for (let i = 0; i < this.nodes.length; i++) {
                if (!this.nodeHasPackets(i)) candidates.push(i);
            }
            if (candidates.length > 0) {
                this.killNode(candidates[Math.floor(Math.random() * candidates.length)]);
            }
        }

        // Spontaneous packets (base rate)
        const activeEdges = this.edges.filter(e => !e.fadingOut);
        if (activeEdges.length > 0 && Math.random() < this.packetRate * dt * 0.01) {
            const edge = activeEdges[Math.floor(Math.random() * activeEdges.length)];
            this.spawnPacket(edge, Math.random() < 0.5 ? 1 : -1);
        }

        // Rebuild edges every 2 seconds (smooth edge add/remove)
        if (Math.floor(t * 0.5) !== this._lastEdgeRebuild) {
            this._lastEdgeRebuild = Math.floor(t * 0.5);
            this.rebuildEdges();
        }

        // Draw edges
        const maxDist = Math.min(this.width, this.height) * this.connectRadius;
        for (const edge of this.edges) {
            if (edge.a >= this.nodes.length || edge.b >= this.nodes.length) continue;
            const a = this.nodes[edge.a], b = this.nodes[edge.b];
            const dx = a.x - b.x, dy = a.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const proximity = Math.max(0, 1 - dist / maxDist);

            // Fade out dying edges
            if (edge.fadingOut) {
                edge.edgeAlpha = Math.max(0, edge.edgeAlpha - dt * 0.003);
                if (edge.edgeAlpha <= 0) continue;
            }

            // Factor in node fade alpha for new nodes
            const faA = a.fadeAlpha !== undefined ? a.fadeAlpha : 1;
            const faB = b.fadeAlpha !== undefined ? b.fadeAlpha : 1;
            const nodeFade = Math.min(faA, faB);
            // Higher baseline (0.25), boosted by traffic
            const alpha = proximity * (0.25 + edge.traffic * 0.5) * edge.edgeAlpha * nodeFade;

            this.ctx.beginPath();
            this.ctx.moveTo(a.x, a.y);
            this.ctx.lineTo(b.x, b.y);
            this.ctx.strokeStyle = `rgba(99,102,241,${alpha})`;
            this.ctx.lineWidth = 0.8 + edge.traffic * 1.5;
            this.ctx.stroke();

            edge.traffic = Math.max(0, edge.traffic - dt * 0.0003);
        }

        // Draw packets — track current node positions for smooth movement
        for (let i = this.packets.length - 1; i >= 0; i--) {
            const pkt = this.packets[i];
            if (pkt.edgeA >= this.nodes.length || pkt.edgeB >= this.nodes.length) {
                this.packets.splice(i, 1); continue;
            }

            pkt.progress += pkt.speed * dt;

            if (pkt.progress >= 1 || pkt.progress <= 0) {
                // Arrived — excite destination
                const destIdx = pkt.speed > 0 ? pkt.edgeB : pkt.edgeA;
                if (destIdx < this.nodes.length) {
                    this.nodes[destIdx].heat = Math.min(this.nodes[destIdx].heat + this.selfExcitation * 0.5, 2);
                }
                this.packets.splice(i, 1);
                continue;
            }

            // Interpolate using CURRENT node positions (nodes move, packets follow)
            const a = this.nodes[pkt.edgeA], b = this.nodes[pkt.edgeB];
            const px = a.x + (b.x - a.x) * pkt.progress;
            const py = a.y + (b.y - a.y) * pkt.progress;

            const { r, g, b: bl } = pkt.color;
            const grad = this.ctx.createRadialGradient(px, py, 0, px, py, 8);
            grad.addColorStop(0, `rgba(${r},${g},${bl},0.8)`);
            grad.addColorStop(1, `rgba(${r},${g},${bl},0)`);
            this.ctx.fillStyle = grad;
            this.ctx.fillRect(px - 8, py - 8, 16, 16);

            this.ctx.beginPath();
            this.ctx.arc(px, py, 2, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(${r},${g},${bl},0.9)`;
            this.ctx.fill();
        }

        // Draw nodes
        for (const node of this.nodes) {
            const fa = node.fadeAlpha !== undefined ? node.fadeAlpha : 1;
            const pulse = 0.7 + 0.3 * Math.sin(t * node.pulseSpeed + node.pulsePhase);
            const heatGlow = 1 + node.heat * 0.5;
            const { r, g, b } = node.color;

            const grad = this.ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius * 3 * heatGlow);
            grad.addColorStop(0, `rgba(${r},${g},${b},${(0.3 + node.heat * 0.3) * pulse * fa})`);
            grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
            this.ctx.fillStyle = grad;
            this.ctx.fillRect(node.x - node.radius * 3 * heatGlow, node.y - node.radius * 3 * heatGlow, node.radius * 6 * heatGlow, node.radius * 6 * heatGlow);

            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, node.radius * pulse * heatGlow, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(${r},${g},${b},${(0.7 + node.heat * 0.2) * pulse * fa})`;
            this.ctx.fill();
        }

        // Fade-in
        if (this.fadeIn > 0) {
            this.fadeIn = Math.max(0, this.fadeIn - 0.008);
            this.ctx.fillStyle = `rgba(6,6,12,${this.fadeIn})`;
            this.ctx.fillRect(0, 0, this.width, this.height);
        }
    }
}


// ============================================
// Wireframe Visualizer (Stochastic Layout)
// Services: web tab
// ============================================

class WireframeVisualizer extends BaseVisualizer {
    constructor(canvas) {
        super(canvas);
        this.blocks = [];
        this.palette = 'cyberpunk';
        this.targetDensity = 0.5;
        this.currentDensity = 0.5;
        this.churnRate = 0.5;
        this.fadeIn = 1.0;
        this._churnTimer = 0;
        this._occupied = new Set(); // track occupied grid cells as "col,row"

        this.initBlocks();
        this.start();
    }

    _cellKey(c, r) { return `${c},${r}`; }

    _rebuildOccupied() {
        this._occupied = new Set();
        for (const b of this.blocks) {
            if (b.targetAlpha > 0) this._occupied.add(this._cellKey(b.col, b.row));
        }
    }

    _findEmptyCell(cols, rows) {
        // Try random cells, fall back to scan
        for (let attempt = 0; attempt < 20; attempt++) {
            const c = Math.floor(Math.random() * cols);
            const r = Math.floor(Math.random() * rows);
            if (!this._occupied.has(this._cellKey(c, r))) return { c, r };
        }
        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                if (!this._occupied.has(this._cellKey(c, r))) return { c, r };
            }
        }
        return null;
    }

    _findEmptyNeighbor(col, row, cols, rows) {
        // Check adjacent cells (including diagonals) for an empty one
        const offsets = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
        // Shuffle offsets for variety
        for (let i = offsets.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [offsets[i], offsets[j]] = [offsets[j], offsets[i]];
        }
        for (const [dc, dr] of offsets) {
            const nc = col + dc, nr = row + dr;
            if (nc >= 0 && nc < cols && nr >= 0 && nr < rows && !this._occupied.has(this._cellKey(nc, nr))) {
                return { c: nc, r: nr };
            }
        }
        return null;
    }

    getColors() {
        return (COLOR_PALETTES[this.palette] || COLOR_PALETTES.cyberpunk).colors;
    }

    getGridDims() {
        const cols = Math.floor(6 * this.currentDensity + 3);
        const rows = Math.floor(8 * this.currentDensity + 3);
        return { cols, rows, cellW: this.width / cols, cellH: this.height / rows };
    }

    initBlocks() {
        this.blocks = [];
        this._occupied = new Set();
        const { cols, rows, cellW, cellH } = this.getGridDims();
        const pad = 6;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (Math.random() > this.currentDensity * 0.7 + 0.2) continue;
                this.blocks.push(this.makeBlock(c, r, cellW, cellH, pad, 1));
                this._occupied.add(this._cellKey(c, r));
            }
        }
    }

    makeBlock(c, r, cellW, cellH, pad, alpha) {
        // Text lines: random widths, each line has a slow drift speed
        const lineCount = 2 + Math.floor(Math.random() * 3);
        const textLines = [];
        for (let i = 0; i < lineCount; i++) {
            textLines.push({
                width: 0.2 + Math.random() * 0.6,
                targetWidth: 0.2 + Math.random() * 0.6,
                driftSpeed: 0.0002 + Math.random() * 0.0003,
                driftTimer: Math.random() * 5000,
            });
        }
        return {
            x: c * cellW + pad, y: r * cellH + pad,
            w: cellW - pad * 2, h: cellH - pad * 2,
            targetX: c * cellW + pad, targetY: r * cellH + pad,
            type: ['rect', 'text-lines', 'text-lines', 'header-bar', 'card'][Math.floor(Math.random() * 5)],
            alpha: alpha,
            targetAlpha: alpha,
            fadeSpeed: 0.002 + Math.random() * 0.002,
            textLines,
            col: c, row: r,
        };
    }

    resize() {
        super.resize();
        if (this.blocks) this.initBlocks();
    }

    setupControls() {
        this.buildControls('viz-controls', 'viz-label', {
            label: 'Displayed: Stochastic Layout Evolution',
            params: [
                {
                    type: 'select', label: 'Colors:', value: this.palette,
                    options: Object.keys(COLOR_PALETTES).map(k => ({ value: k, label: COLOR_PALETTES[k].name })),
                    onChange: v => { this.palette = v; }
                },
                {
                    type: 'range', label: 'Density:', min: 0.2, max: 1, step: 0.05, value: this.targetDensity,
                    onChange: v => { this.targetDensity = v; }
                },
                {
                    type: 'range', label: 'Churn Rate:', min: 0.1, max: 2, step: 0.1, value: this.churnRate,
                    onChange: v => { this.churnRate = v; }
                },
            ]
        });
    }

    render(dt) {
        this.ctx.fillStyle = '#06060c';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Subtle grid
        this.ctx.strokeStyle = 'rgba(26,26,46,0.4)';
        this.ctx.lineWidth = 0.5;
        const gs = 40;
        for (let x = 0; x < this.width; x += gs) {
            this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.height); this.ctx.stroke();
        }
        for (let y = 0; y < this.height; y += gs) {
            this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(this.width, y); this.ctx.stroke();
        }

        const colors = this.getColors();

        const { cols, rows, cellW, cellH } = this.getGridDims();
        const pad = 6;

        // If grid dims changed, cull out-of-bounds blocks and rebuild occupancy
        const oobBlocks = this.blocks.filter(b => b.col >= cols || b.row >= rows);
        if (oobBlocks.length > 0) {
            for (const b of oobBlocks) {
                b.targetAlpha = 0;
                this._occupied.delete(this._cellKey(b.col, b.row));
            }
        }

        // Smooth density adjustment: fade blocks in/out
        if (Math.abs(this.targetDensity - this.currentDensity) > 0.01) {
            const dir = this.targetDensity > this.currentDensity ? 1 : -1;
            this.currentDensity += dir * dt * 0.0003;
            this.currentDensity = dir > 0
                ? Math.min(this.currentDensity, this.targetDensity)
                : Math.max(this.currentDensity, this.targetDensity);

            if (dir > 0) {
                if (Math.random() < 0.05 * dt) {
                    const empty = this._findEmptyCell(cols, rows);
                    if (empty) {
                        const b = this.makeBlock(empty.c, empty.r, cellW, cellH, pad, 0);
                        b.targetAlpha = 1;
                        this.blocks.push(b);
                        this._occupied.add(this._cellKey(empty.c, empty.r));
                    }
                }
            } else {
                const visible = this.blocks.filter(b => b.targetAlpha > 0);
                if (visible.length > 0 && Math.random() < 0.05 * dt) {
                    const b = visible[Math.floor(Math.random() * visible.length)];
                    b.targetAlpha = 0;
                    this._occupied.delete(this._cellKey(b.col, b.row));
                }
            }
        }

        // Stochastic churn events
        this._churnTimer += dt;
        const churnInterval = 400 / this.churnRate;
        if (this._churnTimer > churnInterval && this.blocks.length > 0) {
            this._churnTimer = 0;
            const action = Math.random();

            if (action < 0.25) {
                // Fade out a random visible block
                const visible = this.blocks.filter(b => b.targetAlpha > 0 && b.alpha > 0.5);
                if (visible.length > 0) {
                    const b = visible[Math.floor(Math.random() * visible.length)];
                    b.targetAlpha = 0;
                    this._occupied.delete(this._cellKey(b.col, b.row));
                }
            } else if (action < 0.5 && this.blocks.length >= 2) {
                // Swap two blocks (always safe, both cells stay occupied)
                const vis = this.blocks.filter(b => b.targetAlpha > 0);
                if (vis.length >= 2) {
                    const i = Math.floor(Math.random() * vis.length);
                    let j = (i + 1 + Math.floor(Math.random() * (vis.length - 1))) % vis.length;
                    const tmpX = vis[i].targetX, tmpY = vis[i].targetY;
                    const tmpC = vis[i].col, tmpR = vis[i].row;
                    vis[i].targetX = vis[j].targetX;
                    vis[i].targetY = vis[j].targetY;
                    vis[i].col = vis[j].col;
                    vis[i].row = vis[j].row;
                    vis[j].targetX = tmpX;
                    vis[j].targetY = tmpY;
                    vis[j].col = tmpC;
                    vis[j].row = tmpR;
                }
            } else if (action < 0.7) {
                // Move a block to a neighboring cell, displacing occupant if needed
                const vis = this.blocks.filter(b => b.targetAlpha > 0);
                if (vis.length > 0) {
                    const mover = vis[Math.floor(Math.random() * vis.length)];
                    const neighbor = this._findEmptyNeighbor(mover.col, mover.row, cols, rows);
                    if (neighbor) {
                        // Move to empty neighbor
                        this._occupied.delete(this._cellKey(mover.col, mover.row));
                        mover.col = neighbor.c;
                        mover.row = neighbor.r;
                        mover.targetX = neighbor.c * cellW + pad;
                        mover.targetY = neighbor.r * cellH + pad;
                        this._occupied.add(this._cellKey(neighbor.c, neighbor.r));
                    } else {
                        // All neighbors occupied — try displacement
                        const offsets = [[-1,0],[1,0],[0,-1],[0,1]];
                        const off = offsets[Math.floor(Math.random() * offsets.length)];
                        const tc = mover.col + off[0], tr = mover.row + off[1];
                        if (tc >= 0 && tc < cols && tr >= 0 && tr < rows) {
                            const occupant = this.blocks.find(b => b.col === tc && b.row === tr && b.targetAlpha > 0);
                            if (occupant) {
                                const emptyForOccupant = this._findEmptyNeighbor(tc, tr, cols, rows);
                                if (emptyForOccupant) {
                                    // Displace occupant to empty cell
                                    this._occupied.delete(this._cellKey(occupant.col, occupant.row));
                                    occupant.col = emptyForOccupant.c;
                                    occupant.row = emptyForOccupant.r;
                                    occupant.targetX = emptyForOccupant.c * cellW + pad;
                                    occupant.targetY = emptyForOccupant.r * cellH + pad;
                                    this._occupied.add(this._cellKey(emptyForOccupant.c, emptyForOccupant.r));
                                    // Move the mover
                                    this._occupied.delete(this._cellKey(mover.col, mover.row));
                                    mover.col = tc;
                                    mover.row = tr;
                                    mover.targetX = tc * cellW + pad;
                                    mover.targetY = tr * cellH + pad;
                                    this._occupied.add(this._cellKey(tc, tr));
                                }
                            }
                        }
                    }
                }
            } else {
                // Respawn a faded block in an empty cell
                const faded = this.blocks.filter(b => b.targetAlpha === 0 && b.alpha < 0.05);
                if (faded.length > 0) {
                    const empty = this._findEmptyCell(cols, rows);
                    if (empty) {
                        const b = faded[Math.floor(Math.random() * faded.length)];
                        b.col = empty.c;
                        b.row = empty.r;
                        b.x = empty.c * cellW + pad;
                        b.y = empty.r * cellH + pad;
                        b.targetX = b.x;
                        b.targetY = b.y;
                        b.w = cellW - pad * 2;
                        b.h = cellH - pad * 2;
                        b.targetAlpha = 1;
                        b.type = ['rect', 'text-lines', 'text-lines', 'header-bar', 'card'][Math.floor(Math.random() * 5)];
                        const lineCount = 2 + Math.floor(Math.random() * 3);
                        b.textLines = [];
                        for (let i = 0; i < lineCount; i++) {
                            b.textLines.push({
                                width: 0.2 + Math.random() * 0.6,
                                targetWidth: 0.2 + Math.random() * 0.6,
                                driftSpeed: 0.0002 + Math.random() * 0.0003,
                                driftTimer: 0,
                            });
                        }
                        this._occupied.add(this._cellKey(empty.c, empty.r));
                    }
                }
            }
        }

        // Clean up fully faded blocks periodically
        if (this.blocks.length > 200) {
            this.blocks = this.blocks.filter(b => b.alpha > 0.01 || b.targetAlpha > 0);
            this._rebuildOccupied();
        }

        // Update block targets from current grid dims (handles density changes)
        for (const bl of this.blocks) {
            bl.targetX = bl.col * cellW + pad;
            bl.targetY = bl.row * cellH + pad;
            bl.w = cellW - pad * 2;
            bl.h = cellH - pad * 2;
        }

        // Update and draw blocks
        for (const bl of this.blocks) {
            bl.alpha += (bl.targetAlpha - bl.alpha) * bl.fadeSpeed * dt;
            bl.alpha = Math.max(0, Math.min(1, bl.alpha));
            bl.x += (bl.targetX - bl.x) * 0.003 * dt;
            bl.y += (bl.targetY - bl.y) * 0.003 * dt;

            if (bl.alpha < 0.01) continue;

            const a = bl.alpha;
            const c = colors[0];
            const c2 = colors[1] || colors[0];

            this.ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${a * 0.5})`;
            this.ctx.lineWidth = 1;

            if (bl.type === 'rect') {
                this.ctx.strokeRect(bl.x, bl.y, bl.w, bl.h);
                this.ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${a * 0.04})`;
                this.ctx.fillRect(bl.x, bl.y, bl.w, bl.h);
            } else if (bl.type === 'text-lines') {
                this.ctx.strokeRect(bl.x, bl.y, bl.w, bl.h);
                for (let i = 0; i < bl.textLines.length; i++) {
                    const line = bl.textLines[i];
                    // Gentle drift: occasionally pick a new target width
                    line.driftTimer += dt;
                    if (line.driftTimer > 3000 + Math.random() * 4000) {
                        line.targetWidth = 0.2 + Math.random() * 0.6;
                        line.driftTimer = 0;
                    }
                    line.width += (line.targetWidth - line.width) * line.driftSpeed * dt;

                    const ly = bl.y + bl.h * 0.15 + i * (bl.h * 0.7 / bl.textLines.length);
                    const lw = bl.w * line.width;
                    this.ctx.fillStyle = `rgba(136,136,168,${a * 0.35})`;
                    this.ctx.fillRect(bl.x + bl.w * 0.08, ly, lw, 2);
                }
            } else if (bl.type === 'header-bar') {
                this.ctx.fillStyle = `rgba(${c2.r},${c2.g},${c2.b},${a * 0.12})`;
                this.ctx.fillRect(bl.x, bl.y, bl.w, bl.h * 0.3);
                this.ctx.strokeRect(bl.x, bl.y, bl.w, bl.h);
            } else if (bl.type === 'card') {
                this.ctx.beginPath();
                this.ctx.roundRect(bl.x, bl.y, bl.w, bl.h, 4);
                this.ctx.stroke();
                this.ctx.fillStyle = `rgba(${c2.r},${c2.g},${c2.b},${a * 0.06})`;
                this.ctx.fill();
            }
        }

        // Fade-in
        if (this.fadeIn > 0) {
            this.fadeIn = Math.max(0, this.fadeIn - 0.008);
            this.ctx.fillStyle = `rgba(6,6,12,${this.fadeIn})`;
            this.ctx.fillRect(0, 0, this.width, this.height);
        }
    }
}


// ============================================
// Data Shape Visualizer (Kernel Density)
// Services: dataviz tab
// Particles with short trailing lines
// ============================================

class DataShapeVisualizer extends BaseVisualizer {
    constructor(canvas) {
        super(canvas);
        this.particleCount = 250;
        this.particles = [];
        this.formations = ['scatter', 'wave', 'clusters', 'spiral'];
        this.currentFormation = 0;
        this.transitionProgress = 1;
        this.lastSwitch = 0;
        this.switchInterval = 6000;
        this.palette = 'cyberpunk';
        this.bandwidth = 0.5;
        this.trailLength = 40; // max history entries per particle
        this.fadeIn = 1.0;

        this.initParticles();
        this.start();
    }

    getColors() {
        return (COLOR_PALETTES[this.palette] || COLOR_PALETTES.cyberpunk).colors;
    }

    initParticles() {
        this.particles = [];
        const colors = this.getColors();
        for (let i = 0; i < this.particleCount; i++) {
            const x = Math.random() * this.width;
            const y = Math.random() * this.height;
            this.particles.push({
                x, y,
                trail: [{ x, y }], // position history ring buffer
                targetX: this.width / 2,
                targetY: this.height / 2,
                size: 1.5 + Math.random() * 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                phase: Math.random() * Math.PI * 2,
                index: i,
            });
        }
        this.computeTargets(0);
    }

    computeTargets(formation) {
        const cx = this.width / 2, cy = this.height / 2;
        const spread = Math.min(this.width, this.height) * 0.35;
        const name = this.formations[formation];

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            const t = i / this.particleCount;

            if (name === 'scatter') {
                const angle = t * Math.PI * 20 + Math.sin(t * 7) * 2;
                const r = Math.sqrt(t) * spread * (0.5 + 0.5 * Math.sin(t * 13));
                p.targetX = cx + Math.cos(angle) * r;
                p.targetY = cy + Math.sin(angle) * r;
            } else if (name === 'wave') {
                p.targetX = cx - spread + t * spread * 2;
                p.targetY = cy + Math.sin(t * Math.PI * 4) * spread * 0.5 * this.bandwidth + (Math.random() - 0.5) * 15;
            } else if (name === 'clusters') {
                const cluster = Math.floor(t * 4) % 4;
                const offsets = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
                const ox = offsets[cluster][0] * spread * 0.45;
                const oy = offsets[cluster][1] * spread * 0.45;
                const angle = Math.random() * Math.PI * 2;
                const r = Math.random() * spread * 0.2 * (0.5 + this.bandwidth);
                p.targetX = cx + ox + Math.cos(angle) * r;
                p.targetY = cy + oy + Math.sin(angle) * r;
            } else if (name === 'spiral') {
                const angle = t * Math.PI * 6;
                const r = t * spread;
                p.targetX = cx + Math.cos(angle) * r;
                p.targetY = cy + Math.sin(angle) * r;
            }
        }
    }

    resize() {
        super.resize();
        if (this.particles && this.particles.length) this.initParticles();
    }

    setupControls() {
        this.buildControls('viz-controls', 'viz-label', {
            label: 'Displayed: Kernel Density Morphing',
            params: [
                {
                    type: 'select', label: 'Colors:', value: this.palette,
                    options: Object.keys(COLOR_PALETTES).map(k => ({ value: k, label: COLOR_PALETTES[k].name })),
                    onChange: v => {
                        this.palette = v;
                        const c = this.getColors();
                        this.particles.forEach(p => p.color = c[Math.floor(Math.random() * c.length)]);
                    }
                },
                {
                    type: 'range', label: 'Bandwidth:', min: 0.2, max: 1.5, step: 0.05, value: this.bandwidth,
                    onChange: v => { this.bandwidth = v; this.computeTargets(this.currentFormation); }
                },
                {
                    type: 'range', label: 'Particles:', min: 80, max: 400, step: 20, value: this.particleCount,
                    onChange: v => { this.particleCount = v; this.initParticles(); }
                },
                {
                    type: 'range', label: 'Trail Length:', min: 5, max: 80, step: 5, value: this.trailLength,
                    onChange: v => { this.trailLength = v; }
                },
            ]
        });
    }

    render(dt) {
        // Full clear each frame — trails are drawn explicitly from history
        this.ctx.fillStyle = '#06060c';
        this.ctx.fillRect(0, 0, this.width, this.height);

        const t = this.time;

        if (t - this.lastSwitch > this.switchInterval) {
            this.lastSwitch = t;
            this.currentFormation = (this.currentFormation + 1) % this.formations.length;
            this.computeTargets(this.currentFormation);
            this.transitionProgress = 0;
        }

        if (this.transitionProgress < 1) {
            this.transitionProgress = Math.min(1, this.transitionProgress + 0.0008 * dt);
        }

        const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const ep = ease(this.transitionProgress);

        for (const p of this.particles) {
            p.x += (p.targetX - p.x) * 0.02 * ep + Math.sin(t * 0.001 + p.phase) * 0.2;
            p.y += (p.targetY - p.y) * 0.02 * ep + Math.cos(t * 0.001 + p.phase * 1.3) * 0.2;

            // Append to trail history
            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > this.trailLength) {
                p.trail.splice(0, p.trail.length - this.trailLength);
            }

            const { r, g, b } = p.color;

            // Draw trail as thin polyline with fading alpha
            if (p.trail.length > 1) {
                for (let i = 1; i < p.trail.length; i++) {
                    const frac = i / p.trail.length; // 0 = oldest, 1 = newest
                    const a = frac * 0.5;
                    this.ctx.beginPath();
                    this.ctx.moveTo(p.trail[i - 1].x, p.trail[i - 1].y);
                    this.ctx.lineTo(p.trail[i].x, p.trail[i].y);
                    this.ctx.strokeStyle = `rgba(${r},${g},${b},${a})`;
                    this.ctx.lineWidth = 1.5;
                    this.ctx.stroke();
                }
            }

            // Core dot
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(${r},${g},${b},${0.5 + 0.3 * ep})`;
            this.ctx.fill();
        }

        // Fade-in
        if (this.fadeIn > 0) {
            this.fadeIn = Math.max(0, this.fadeIn - 0.008);
            this.ctx.fillStyle = `rgba(6,6,12,${this.fadeIn})`;
            this.ctx.fillRect(0, 0, this.width, this.height);
        }
    }
}


// ============================================
// Clarity Visualizer (Hidden Structure Revealed)
// Services: clarity tab
// ============================================

class ClarityVisualizer extends BaseVisualizer {
    constructor(canvas) {
        super(canvas);
        this.palette = 'cyberpunk';
        this.scanSpeed = 0.5;
        this.cdfA_start = 0.5;  // CDF at scan 1 (unstructured)
        this.cdfB_start = 0.0;  // CDF at scan 1 (structured)
        this.fadeIn = 1.0;

        this.flowNodes = [];
        this.flowEdges = [];
        this.type1Dots = [];
        this.type2Dots = [];
        this.flowParticles = [];

        this.nextPass = 0;
        this.totalPasses = 10;
        this.scanners = [];
        this.scanTimer = 0;
        this.scanInterval = 1500; // ms between scanner launches

        // Phase: 'noisy' -> 'scanning' -> 'revealed' -> 'dissolving' (-> back to 'scanning')
        this.phase = 'noisy';
        this.phaseTimer = 0;

        this.initFlowchart();
        this.initType1Dots();
        this.initType2Dots();
        this.start();
    }

    getColors() {
        return (COLOR_PALETTES[this.palette] || COLOR_PALETTES.cyberpunk).colors;
    }

    // Linear CDF from start to 1.0, back out conditional probability
    _cdfProb(pass, cdfStart) {
        const n = this.totalPasses;
        // CDF value at this pass (linear interpolation: cdfStart at pass 0, 1.0 at pass n-1)
        const cdf = cdfStart + (1 - cdfStart) * pass / (n - 1);
        // CDF at previous pass
        const cdfPrev = pass === 0 ? 0 : cdfStart + (1 - cdfStart) * (pass - 1) / (n - 1);
        // Conditional: P(trigger | survived) = (cdf - cdfPrev) / (1 - cdfPrev)
        const denom = 1 - cdfPrev;
        if (denom <= 0) return 1;
        return Math.min(1, (cdf - cdfPrev) / denom);
    }

    curveA(pass) { return this._cdfProb(pass, this.cdfA_start); }
    curveB(pass) { return this._cdfProb(pass, this.cdfB_start); }

    initFlowchart() {
        this.flowNodes = [];
        this.flowEdges = [];
        const layers = 5 + Math.floor(Math.random() * 3);
        const nodesPerLayer = () => 2 + Math.floor(Math.random() * 3);
        const colors = this.getColors();
        const margin = 0.1;
        const usableW = this.width * (1 - 2 * margin);
        const usableH = this.height * (1 - 2 * margin);
        const startX = this.width * margin;
        const startY = this.height * margin;

        let nodeId = 0;
        const layerNodes = [];

        for (let l = 0; l < layers; l++) {
            const count = nodesPerLayer();
            const row = [];
            for (let n = 0; n < count; n++) {
                const x = startX + (n + 0.5) / count * usableW;
                const y = startY + (l + 0.5) / layers * usableH;
                this.flowNodes.push({
                    id: nodeId, x, y,
                    homeX: x, homeY: y,
                    radius: 4 + Math.random() * 4,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    layer: l,
                    wanderPhaseX: Math.random() * Math.PI * 2,
                    wanderPhaseY: Math.random() * Math.PI * 2,
                    wanderSpeedX: 0.0003 + Math.random() * 0.0003,
                    wanderSpeedY: 0.0003 + Math.random() * 0.0003,
                    wanderRadius: 20 + Math.random() * 30,
                });
                row.push(nodeId);
                nodeId++;
            }
            layerNodes.push(row);
        }

        for (let l = 0; l < layers - 1; l++) {
            for (const srcId of layerNodes[l]) {
                const targets = layerNodes[l + 1];
                const count = 1 + Math.floor(Math.random() * Math.min(2, targets.length));
                const picked = new Set();
                for (let c = 0; c < count; c++) {
                    const t = targets[Math.floor(Math.random() * targets.length)];
                    if (!picked.has(t)) { picked.add(t); this.flowEdges.push({ from: srcId, to: t }); }
                }
            }
            for (const tgtId of layerNodes[l + 1]) {
                if (!this.flowEdges.some(e => e.to === tgtId)) {
                    const src = layerNodes[l][Math.floor(Math.random() * layerNodes[l].length)];
                    this.flowEdges.push({ from: src, to: tgtId });
                }
            }
        }
    }

    initType1Dots() {
        this.type1Dots = [];
        const colors = this.getColors();
        const noiseCount = 600;
        for (let i = 0; i < noiseCount; i++) {
            this.type1Dots.push({
                x: Math.random() * this.width, y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.8,
                size: 1 + Math.random() * 2.5,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 0.3 + Math.random() * 0.5,
                fadeOut: 0,
                respawnDelay: Math.random() * 4000,
            });
        }
    }

    initType2Dots() {
        this.type2Dots = [];
        this.flowParticles = [];
        const colors = this.getColors();

        for (const edge of this.flowEdges) {
            const a = this.flowNodes[edge.from];
            const b = this.flowNodes[edge.to];
            const dx = b.x - a.x, dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const dotCount = Math.floor(dist / 8);
            for (let i = 0; i <= dotCount; i++) {
                const t = dotCount > 0 ? i / dotCount : 0;
                this.type2Dots.push({
                    edgeRef: edge, edgeFrac: t,
                    nodeRef: null, nodeAngle: 0, nodeRadFrac: 0,
                    x: Math.random() * this.width, y: Math.random() * this.height,
                    vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6,
                    size: 1.5 + Math.random() * 1.5,
                    trueColor: a.color,
                    noiseColor: colors[Math.floor(Math.random() * colors.length)],
                    state: 'scattered', travelProgress: 0,
                    travelStartX: 0, travelStartY: 0,
                    edge: edge,
                });
            }
        }
        for (const node of this.flowNodes) {
            for (let i = 0; i < 8; i++) {
                const angle = Math.random() * Math.PI * 2;
                const radFrac = Math.random();
                this.type2Dots.push({
                    edgeRef: null, edgeFrac: 0,
                    nodeRef: node, nodeAngle: angle, nodeRadFrac: radFrac,
                    x: Math.random() * this.width, y: Math.random() * this.height,
                    vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6,
                    size: 2 + Math.random() * 2,
                    trueColor: node.color,
                    noiseColor: colors[Math.floor(Math.random() * colors.length)],
                    state: 'scattered', travelProgress: 0,
                    travelStartX: 0, travelStartY: 0,
                    edge: null,
                });
            }
        }
    }

    // Reassign existing Type 2 dots to new flowchart positions (no deletion/creation pop)
    reassignType2Dots() {
        const colors = this.getColors();

        // Build list of target positions on the new network
        const targets = [];
        for (const edge of this.flowEdges) {
            const a = this.flowNodes[edge.from];
            const b = this.flowNodes[edge.to];
            const dx = b.x - a.x, dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const dotCount = Math.floor(dist / 8);
            for (let i = 0; i <= dotCount; i++) {
                targets.push({
                    edgeRef: edge, edgeFrac: dotCount > 0 ? i / dotCount : 0,
                    nodeRef: null, nodeAngle: 0, nodeRadFrac: 0,
                    trueColor: a.color, edge: edge,
                });
            }
        }
        for (const node of this.flowNodes) {
            for (let i = 0; i < 8; i++) {
                targets.push({
                    edgeRef: null, edgeFrac: 0,
                    nodeRef: node, nodeAngle: Math.random() * Math.PI * 2,
                    nodeRadFrac: Math.random(),
                    trueColor: node.color, edge: null,
                });
            }
        }

        // Grow or shrink dot pool to match
        while (this.type2Dots.length < targets.length) {
            this.type2Dots.push({
                edgeRef: null, edgeFrac: 0, nodeRef: null, nodeAngle: 0, nodeRadFrac: 0,
                x: Math.random() * this.width, y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6,
                size: 1.5 + Math.random() * 2,
                trueColor: colors[0], noiseColor: colors[0],
                state: 'scattered', travelProgress: 0,
                travelStartX: 0, travelStartY: 0, edge: null,
            });
        }
        this.type2Dots.length = targets.length;

        // Reassign each dot: keep position/velocity, update target
        for (let i = 0; i < targets.length; i++) {
            const d = this.type2Dots[i];
            const tgt = targets[i];
            d.edgeRef = tgt.edgeRef;
            d.edgeFrac = tgt.edgeFrac;
            d.nodeRef = tgt.nodeRef;
            d.nodeAngle = tgt.nodeAngle;
            d.nodeRadFrac = tgt.nodeRadFrac;
            d.edge = tgt.edge;
            d.trueColor = tgt.trueColor;
            d.noiseColor = colors[Math.floor(Math.random() * colors.length)];
            d.state = 'scattered';
            d.travelProgress = 0;
            d.fadeOut = 0;
            // x, y, vx, vy, size all preserved — dot stays where it is
        }

        this.flowParticles = [];
    }

    // Seamless transition to next cycle
    startNewCycle() {
        // Reset Type 1 dots
        for (const d of this.type1Dots) {
            d.fadeOut = 0;
            d.respawnDelay = Math.random() * 4000;
        }
        // New flowchart, reassign existing Type 2 dots
        this.initFlowchart();
        this.reassignType2Dots();
        // Go straight to scanning
        this.phase = 'scanning';
        this.phaseTimer = 0;
        this.nextPass = 0;
        this.scanners = [];
        this.scanTimer = 0;
        this.startNewPass();
    }

    getTruePos(d) {
        if (d.edgeRef) {
            const a = this.flowNodes[d.edgeRef.from];
            const b = this.flowNodes[d.edgeRef.to];
            return { x: a.x + (b.x - a.x) * d.edgeFrac, y: a.y + (b.y - a.y) * d.edgeFrac };
        } else if (d.nodeRef) {
            return {
                x: d.nodeRef.x + Math.cos(d.nodeAngle) * d.nodeRadFrac * d.nodeRef.radius,
                y: d.nodeRef.y + Math.sin(d.nodeAngle) * d.nodeRadFrac * d.nodeRef.radius,
            };
        }
        return { x: d.x, y: d.y };
    }

    startNewPass() {
        const passNum = this.nextPass;
        this.nextPass++;
        this.scanners.push({
            angle: Math.random() * Math.PI,
            position: -0.02,
            speed: (0.000125 + Math.random() * 0.000075) * this.scanSpeed,
            width: 2,
            passNumber: passNum,
            processed: new Set(),
        });
    }

    // Is a point within threshold pixels behind a scanner line (just passed)?
    isNearScanner(sc, px, py, threshold) {
        const cos = Math.cos(sc.angle), sin = Math.sin(sc.angle);
        const cx = this.width / 2, cy = this.height / 2;
        const proj = (px - cx) * cos + (py - cy) * sin;
        const maxProj = Math.max(this.width, this.height);
        const normalizedPos = (proj + maxProj) / (2 * maxProj);
        const pixelDist = (sc.position - normalizedPos) * 2 * maxProj;
        return pixelDist >= 0 && pixelDist < threshold;
    }

    resize() {
        super.resize();
        this.initFlowchart();
        this.initType1Dots();
        this.initType2Dots();
        this.scanners = [];
        this.nextPass = 0;
        this.phase = 'noisy';
        this.phaseTimer = 0;
    }

    setupControls() {
        this.buildControls('viz-controls', 'viz-label', {
            label: 'Displayed: Information Distillation',
            params: [
                {
                    type: 'select', label: 'Colors:', value: this.palette,
                    options: Object.keys(COLOR_PALETTES).map(k => ({ value: k, label: COLOR_PALETTES[k].name })),
                    onChange: v => {
                        this.palette = v;
                        this.initFlowchart();
                        this.initType1Dots();
                        this.initType2Dots();
                        this.nextPass = 0;
                        this.phase = 'noisy';
                        this.scanners = [];
                    }
                },
                {
                    type: 'range', label: 'Noise Clear (scan 1):', min: 0.1, max: 0.8, step: 0.05, value: this.cdfA_start,
                    onChange: v => { this.cdfA_start = v; }
                },
                {
                    type: 'range', label: 'Reveal (scan 1):', min: 0, max: 0.3, step: 0.01, value: this.cdfB_start,
                    onChange: v => { this.cdfB_start = v; }
                },
            ]
        });
    }

    render(dt) {
        this.ctx.fillStyle = '#06060c';
        this.ctx.fillRect(0, 0, this.width, this.height);

        const t = this.time;
        for (const node of this.flowNodes) {
            node.x = node.homeX + Math.sin(t * node.wanderSpeedX + node.wanderPhaseX) * node.wanderRadius;
            node.y = node.homeY + Math.sin(t * node.wanderSpeedY + node.wanderPhaseY) * node.wanderRadius * 0.6;
        }

        this.phaseTimer += dt;

        // ---- Phase management ----
        if (this.phase === 'noisy' && this.phaseTimer > 2000 && this.fadeIn <= 0) {
            this.phase = 'scanning';
            this.phaseTimer = 0;
            this.nextPass = 0;
            this.scanners = [];
            this.scanTimer = 0;
            this.startNewPass();
        }

        if (this.phase === 'scanning') {
            // Advance all active scanners
            for (const sc of this.scanners) {
                sc.position += sc.speed * dt;

                const pA = this.curveA(sc.passNumber);
                const pB = this.curveB(sc.passNumber);

                for (let i = 0; i < this.type1Dots.length; i++) {
                    const d = this.type1Dots[i];
                    if (d.fadeOut > 0) continue;
                    if (sc.processed.has('n' + i)) continue;
                    if (this.isNearScanner(sc, d.x, d.y, 20)) {
                        sc.processed.add('n' + i);
                        if (Math.random() < pA) d.fadeOut = 0.001;
                    }
                }

                for (let i = 0; i < this.type2Dots.length; i++) {
                    const d = this.type2Dots[i];
                    if (d.state !== 'scattered') continue;
                    if (sc.processed.has('f' + i)) continue;
                    if (this.isNearScanner(sc, d.x, d.y, 20)) {
                        sc.processed.add('f' + i);
                        if (Math.random() < pB) {
                            if (d.edge && Math.random() < 0.2) {
                                d.state = 'flowing';
                                d.fadeOut = 0.001;
                            } else {
                                d.state = 'traveling';
                                d.travelStartX = d.x;
                                d.travelStartY = d.y;
                                d.travelProgress = 0;
                            }
                        }
                    }
                }
            }

            // Remove finished scanners
            this.scanners = this.scanners.filter(sc => sc.position <= 1.02);

            // Launch next pass on a fixed timer (evenly spaced)
            this.scanTimer += dt;
            if (this.nextPass < this.totalPasses && this.scanTimer >= this.scanInterval) {
                this.scanTimer = 0;
                this.startNewPass();
            }

            // All passes launched and all scanners done
            if (this.nextPass >= this.totalPasses && this.scanners.length === 0) {
                this.phase = 'revealed';
                this.phaseTimer = 0;
            }
        }

        if (this.phase === 'revealed' && this.phaseTimer > 6000) {
            this.phase = 'dissolving';
            this.phaseTimer = 0;
        }

        // Dissolve: network fades (2s), noise reappears (staggered over 10s), then seamless transition
        if (this.phase === 'dissolving' && this.phaseTimer > 8000) {
            this.startNewCycle(); // seamless — no resetting, no fade-to-black
        }

        const dissolveFactor = this.phase === 'dissolving'
            ? Math.min(1, this.phaseTimer / 2000) : 0;
        // How far through the full dissolve period (0→1 over 5s)
        const dissolveProgress = this.phase === 'dissolving'
            ? Math.min(1, this.phaseTimer / 5000) : 0;
        const dissolveTime = this.phase === 'dissolving' ? this.phaseTimer : 0;

        // ---- Type 1 (noise) dots ----
        for (const d of this.type1Dots) {
            d.x += d.vx * dt * 0.03;
            d.y += d.vy * dt * 0.03;
            if (d.x < 0) d.x += this.width;
            if (d.x > this.width) d.x -= this.width;
            if (d.y < 0) d.y += this.height;
            if (d.y > this.height) d.y -= this.height;

            if (d.fadeOut > 0 && d.fadeOut < 1) {
                d.fadeOut = Math.min(1, d.fadeOut + dt * 0.01); // ~0.1 second fade-out
            }

            let alpha;
            if (this.phase === 'dissolving' && d.fadeOut >= 1) {
                const timeSinceRespawn = dissolveTime - d.respawnDelay;
                if (timeSinceRespawn <= 0) { continue; }
                const fadeInProgress = Math.min(1, timeSinceRespawn / 1000);
                alpha = d.alpha * fadeInProgress;
                if (timeSinceRespawn < dt * 2) {
                    d.x = Math.random() * this.width;
                    d.y = Math.random() * this.height;
                }
                // Once fully faded in, mark as alive for next cycle
                if (fadeInProgress >= 1) d.fadeOut = 0;
            } else {
                alpha = d.alpha * (1 - d.fadeOut);
            }

            if (alpha < 0.02 && d.fadeOut >= 1) continue;

            const { r, g, b } = d.color;

            if (d.fadeOut > 0 && d.fadeOut < 1) {
                // Pop effect: bloom outward, flash bright, then vanish
                const pop = d.fadeOut; // 0→1 over ~0.1s
                const popSize = d.size * (1 + pop * 4); // expand to 5x
                const popAlpha = (1 - pop) * 0.9; // bright then gone
                // Shift toward white
                const pr = Math.round(r + (255 - r) * (1 - pop) * 0.6);
                const pg = Math.round(g + (255 - g) * (1 - pop) * 0.6);
                const pb = Math.round(b + (255 - b) * (1 - pop) * 0.6);
                this.ctx.beginPath();
                this.ctx.arc(d.x, d.y, popSize, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(${pr},${pg},${pb},${popAlpha})`;
                this.ctx.fill();
            } else if (d.fadeOut < 1) {
                this.ctx.beginPath();
                this.ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
                this.ctx.fill();
            }
        }

        // ---- Type 2 (network) dots ----
        const placedCount = this.type2Dots.filter(d => d.state === 'placed').length;
        const placedFrac = this.type2Dots.length > 0 ? placedCount / this.type2Dots.length : 0;

        // Draw edges
        for (const edge of this.flowEdges) {
            const a = this.flowNodes[edge.from];
            const b = this.flowNodes[edge.to];
            const alpha = placedFrac * 0.3 * (1 - dissolveProgress);
            if (alpha < 0.01) continue;
            this.ctx.beginPath();
            this.ctx.moveTo(a.x, a.y);
            this.ctx.lineTo(b.x, b.y);
            this.ctx.strokeStyle = `rgba(99,102,241,${alpha})`;
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }

        for (const d of this.type2Dots) {
            if (d.state === 'scattered') {
                d.x += d.vx * dt * 0.03;
                d.y += d.vy * dt * 0.03;
                if (d.x < 0) d.x += this.width;
                if (d.x > this.width) d.x -= this.width;
                if (d.y < 0) d.y += this.height;
                if (d.y > this.height) d.y -= this.height;

                const { r, g, b } = d.noiseColor;
                this.ctx.beginPath();
                this.ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(${r},${g},${b},0.4)`;
                this.ctx.fill();

            } else if (d.state === 'traveling') {
                d.travelProgress = Math.min(1, d.travelProgress + dt * 0.001);
                const ep = 1 - Math.pow(1 - d.travelProgress, 3); // cubic ease-out
                const tp = this.getTruePos(d);
                d.x = d.travelStartX + (tp.x - d.travelStartX) * ep;
                d.y = d.travelStartY + (tp.y - d.travelStartY) * ep;

                const { r: tr, g: tg, b: tb } = d.trueColor;
                const { r: nr, g: ng, b: nb } = d.noiseColor;
                const cr = Math.round(nr + (tr - nr) * ep);
                const cg = Math.round(ng + (tg - ng) * ep);
                const cb = Math.round(nb + (tb - nb) * ep);

                this.ctx.beginPath();
                this.ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.4 + 0.4 * ep})`;
                this.ctx.fill();

                if (d.travelProgress >= 1) d.state = 'placed';

            } else if (d.state === 'placed') {
                const tp = this.getTruePos(d);

                if (dissolveProgress > 0) {
                    // Store starting position on first dissolve frame
                    if (!d._dissolveStartX) {
                        d._dissolveStartX = tp.x;
                        d._dissolveStartY = tp.y;
                        // Pick a random scatter target
                        d._dissolveTargetX = tp.x + d.vx * 400;
                        d._dissolveTargetY = tp.y + d.vy * 400;
                    }

                    const dp = Math.min(1, dissolveProgress * 1.5);

                    // Smooth interpolation from true position to scatter target
                    const ease = t => t * t * (3 - 2 * t); // smoothstep
                    const ep = ease(dp);
                    const drawX = d._dissolveStartX + (d._dissolveTargetX - d._dissolveStartX) * ep;
                    const drawY = d._dissolveStartY + (d._dissolveTargetY - d._dissolveStartY) * ep;

                    // Color: true → noise
                    const { r: tr, g: tg, b: tb } = d.trueColor;
                    const { r: nr, g: ng, b: nb } = d.noiseColor;
                    const cr = Math.round(tr + (nr - tr) * ep);
                    const cg = Math.round(tg + (ng - tg) * ep);
                    const cb = Math.round(tb + (nb - tb) * ep);
                    const alpha = 0.8 - 0.4 * ep; // 0.8 → 0.4

                    this.ctx.beginPath();
                    this.ctx.arc(drawX, drawY, d.size, 0, Math.PI * 2);
                    this.ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
                    this.ctx.fill();

                    // When fully reverted, become scattered at the target position
                    if (dp >= 1) {
                        d.x = d._dissolveTargetX;
                        d.y = d._dissolveTargetY;
                        d.state = 'scattered';
                        d._dissolveStartX = null;
                        d._dissolveStartY = null;
                    }
                } else {
                    // Normal placed rendering
                    const { r, g, b } = d.trueColor;
                    this.ctx.beginPath();
                    this.ctx.arc(tp.x, tp.y, d.size, 0, Math.PI * 2);
                    this.ctx.fillStyle = `rgba(${r},${g},${b},0.8)`;
                    this.ctx.fill();
                }

            } else if (d.state === 'flowing') {
                if (!d.fadeOut) d.fadeOut = 0.001;
                d.fadeOut = Math.min(1, d.fadeOut + dt * 0.003);
                d.x += d.vx * dt * 0.03;
                d.y += d.vy * dt * 0.03;
                if (d.fadeOut < 1) {
                    const { r, g, b } = d.noiseColor;
                    this.ctx.beginPath();
                    this.ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
                    this.ctx.fillStyle = `rgba(${r},${g},${b},${0.4 * (1 - d.fadeOut)})`;
                    this.ctx.fill();
                }
            }
        }

        // ---- Flow particles ----
        if (placedFrac > 0.3 || this.phase === 'revealed') {
            if (Math.random() < 0.015 * dt * (placedFrac + 0.2)) {
                const edge = this.flowEdges[Math.floor(Math.random() * this.flowEdges.length)];
                this.flowParticles.push({
                    edge, progress: 0,
                    speed: 0.0003 + Math.random() * 0.0003,
                    color: this.flowNodes[edge.from].color,
                });
            }
        }

        for (let i = this.flowParticles.length - 1; i >= 0; i--) {
            const fp = this.flowParticles[i];
            fp.progress += fp.speed * dt;
            if (fp.progress > 1 || dissolveFactor > 0.8) {
                this.flowParticles.splice(i, 1); continue;
            }
            const a = this.flowNodes[fp.edge.from];
            const b = this.flowNodes[fp.edge.to];
            const px = a.x + (b.x - a.x) * fp.progress;
            const py = a.y + (b.y - a.y) * fp.progress;
            const { r, g, b: bl } = fp.color;
            const alpha = 0.8 * (1 - dissolveFactor);

            const grad = this.ctx.createRadialGradient(px, py, 0, px, py, 5);
            grad.addColorStop(0, `rgba(${r},${g},${bl},${alpha})`);
            grad.addColorStop(1, `rgba(${r},${g},${bl},0)`);
            this.ctx.fillStyle = grad;
            this.ctx.fillRect(px - 5, py - 5, 10, 10);
            this.ctx.beginPath();
            this.ctx.arc(px, py, 1.5, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(${r},${g},${bl},${alpha})`;
            this.ctx.fill();
        }

        // ---- Scanner lines ----
        for (const sc of this.scanners) {
            if (sc.position < -0.02 || sc.position > 1.02) continue;
            const cos = Math.cos(sc.angle), sin = Math.sin(sc.angle);
            const cx = this.width / 2, cy = this.height / 2;
            const perpX = -sin, perpY = cos;
            const maxProj = Math.max(this.width, this.height);
            const lineLen = maxProj * 1.5; // line length (extends past edges)
            const posOffset = (sc.position * 2 - 1) * maxProj; // matches processing coords
            const lx = cx + cos * posOffset;
            const ly = cy + sin * posOffset;

            this.ctx.beginPath();
            this.ctx.moveTo(lx - perpX * lineLen, ly - perpY * lineLen);
            this.ctx.lineTo(lx + perpX * lineLen, ly + perpY * lineLen);
            this.ctx.strokeStyle = 'rgba(0,240,255,0.2)';
            this.ctx.lineWidth = sc.width;
            this.ctx.stroke();
            this.ctx.strokeStyle = 'rgba(0,240,255,0.06)';
            this.ctx.lineWidth = sc.width * 8;
            this.ctx.stroke();
        }

        // Fade-in (first load only)
        if (this.fadeIn > 0) {
            this.fadeIn = Math.max(0, this.fadeIn - 0.008);
            this.ctx.fillStyle = `rgba(6,6,12,${this.fadeIn})`;
            this.ctx.fillRect(0, 0, this.width, this.height);
        }
    }
}


// ============================================
// Navigation
// ============================================

function initNavigation() {
    const toggle = document.querySelector('.nav-toggle');
    const menu = document.querySelector('.nav-menu');
    if (toggle && menu) {
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('active');
            menu.classList.toggle('active');
        });
        menu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                toggle.classList.remove('active');
                menu.classList.remove('active');
            });
        });
    }
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            navbar.style.background = window.scrollY > 50 ? 'rgba(10,10,15,0.95)' : 'rgba(10,10,15,0.8)';
        });
    }
}


// ============================================
// Smooth Scrolling
// ============================================

function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
}


// ============================================
// Service Tabs with Background Switching
// ============================================

function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    if (!tabBtns.length) return;

    const canvas = document.getElementById('gp-canvas');
    if (!canvas) return;

    const vizClasses = {
        spacetime: SpatialGPVisualizer,
        stats: NetworkVisualizer,
        web: WireframeVisualizer,
        dataviz: DataShapeVisualizer,
        clarity: ClarityVisualizer,
    };

    let currentViz = null;
    let currentTab = null;

    function activateTab(tabId) {
        tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
        tabContents.forEach(content => content.classList.toggle('active', content.id === 'tab-' + tabId));
        document.body.classList.toggle('dataviz-active', tabId === 'dataviz');

        if (tabId !== currentTab && vizClasses[tabId]) {
            if (currentViz) currentViz.stop();
            currentViz = new vizClasses[tabId](canvas);
            if (currentViz.setupControls) currentViz.setupControls();
            currentTab = tabId;
            window._servicesViz = currentViz;
        }
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            activateTab(btn.dataset.tab);
            history.replaceState(null, '', '#' + btn.dataset.tab);
        });
    });

    const hash = window.location.hash.slice(1);
    const validTab = Object.keys(vizClasses).includes(hash) ? hash : 'spacetime';
    activateTab(validTab);

    return currentViz;
}


// ============================================
// Intersection Observer for Animations
// ============================================

function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, { root: null, rootMargin: '0px', threshold: 0.1 });

    document.querySelectorAll('.service-card, .feature, .expertise-list li').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

const style = document.createElement('style');
style.textContent = `.animate-in { opacity: 1 !important; transform: translateY(0) !important; }`;
document.head.appendChild(style);


// ============================================
// Initialize
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gp-canvas');
    let activeViz = null;

    const isServicesPage = document.querySelector('.tabs-section') !== null;
    const isHomePage = document.querySelector('.hero') !== null;

    if (canvas) {
        if (isServicesPage) {
            activeViz = initTabs();
        } else {
            activeViz = new NightSkyVisualizer(canvas);
        }
    }

    document.addEventListener('visibilitychange', () => {
        const viz = window._servicesViz || activeViz;
        if (!viz) return;
        if (document.hidden) viz.pause();
        else viz.resume();
    });

    initNavigation();
    initSmoothScroll();
    initScrollAnimations();
});
