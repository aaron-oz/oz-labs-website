/**
 * OZ Statistical Consulting - Main JavaScript
 *
 * Features a live visualization of a Spatial Gaussian Process
 * using the squared exponential (RBF) kernel
 */

// ============================================
// Spatial Gaussian Process Visualization
// ============================================

class SpatialGPVisualizer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Grid parameters
        this.gridSize = 60; // Number of points in each dimension
        this.values = [];

        // GP Hyperparameters
        this.lengthScale = 0.5; // Correlation length scale (larger = smoother)
        this.variance = 1.0;     // Signal variance
        this.timeScale = 0.002; // How fast the field evolves

        // Animation state
        this.startTime = performance.now();
        this.time = 0;
        this.noiseSeeds = [];
        this.animationId = null;

        // Color palette for the visualization
        this.colors = {
            low: { r: 10, g: 10, b: 25 },      // Dark blue-black
            mid: { r: 99, g: 102, b: 241 },    // Primary purple
            high: { r: 34, g: 211, b: 238 }    // Cyan accent
        };

        this.init();
    }

    init() {
        this.resize();
        this.initializeNoiseSeeds();
        window.addEventListener('resize', () => this.resize());
        this.animate();
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.canvas.style.width = window.innerWidth + 'px';
        this.canvas.style.height = window.innerHeight + 'px';
        this.ctx.scale(dpr, dpr);

        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.cellWidth = this.width / this.gridSize;
        this.cellHeight = this.height / this.gridSize;
    }

    initializeNoiseSeeds() {
        // Initialize multiple layers of Perlin-like noise seeds
        // for creating smooth, correlated random fields
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

    /**
     * Generate smooth noise at a point using interpolation
     * This approximates sampling from a GP with squared exponential kernel
     */
    smoothNoise(x, y, layer, timeOffset = 0) {
        const seeds = this.noiseSeeds[layer];

        // Find grid cell
        const xi = Math.floor(x);
        const yi = Math.floor(y);

        // Fractional position within cell
        const xf = x - xi;
        const yf = y - yi;

        // Smooth interpolation function (quintic for smoother derivatives)
        const smoothstep = t => t * t * t * (t * (t * 6 - 15) + 10);
        const sx = smoothstep(xf);
        const sy = smoothstep(yf);

        // Get corner values with time evolution
        const t = this.time * this.timeScale + timeOffset;
        const getValue = (i, j) => {
            const ii = Math.max(0, Math.min(this.gridSize, i));
            const jj = Math.max(0, Math.min(this.gridSize, j));
            return Math.sin(seeds[ii][jj] + t * (1 + layer * 0.5));
        };

        const n00 = getValue(xi, yi);
        const n10 = getValue(xi + 1, yi);
        const n01 = getValue(xi, yi + 1);
        const n11 = getValue(xi + 1, yi + 1);

        // Bilinear interpolation
        const nx0 = n00 * (1 - sx) + n10 * sx;
        const nx1 = n01 * (1 - sx) + n11 * sx;

        return nx0 * (1 - sy) + nx1 * sy;
    }

    /**
     * Sample from the approximate Gaussian Process
     * Uses multiple octaves of smooth noise to create fractal-like structure
     * similar to real spatial processes
     */
    sampleGP(x, y) {
        // Normalize coordinates to [0, gridSize]
        const nx = (x / this.width) * this.gridSize;
        const ny = (y / this.height) * this.gridSize;

        let value = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxAmplitude = 0;

        // Multiple octaves create multi-scale spatial structure
        for (let octave = 0; octave < 3; octave++) {
            value += amplitude * this.smoothNoise(
                nx * frequency / (this.lengthScale * 10),
                ny * frequency / (this.lengthScale * 10),
                octave,
                octave * 0.3
            );
            maxAmplitude += amplitude;
            amplitude *= 0.5;  // Amplitude decay
            frequency *= 2;   // Frequency increase
        }

        // Normalize to [-1, 1]
        return value / maxAmplitude;
    }

    /**
     * Map GP value to color
     * Creates smooth gradient from dark to light based on field value
     */
    valueToColor(value) {
        // Normalize value from [-1, 1] to [0, 1]
        const t = (value + 1) / 2;

        let r, g, b;

        if (t < 0.5) {
            // Interpolate from low to mid
            const s = t * 2;
            r = this.colors.low.r + (this.colors.mid.r - this.colors.low.r) * s;
            g = this.colors.low.g + (this.colors.mid.g - this.colors.low.g) * s;
            b = this.colors.low.b + (this.colors.mid.b - this.colors.low.b) * s;
        } else {
            // Interpolate from mid to high
            const s = (t - 0.5) * 2;
            r = this.colors.mid.r + (this.colors.high.r - this.colors.mid.r) * s;
            g = this.colors.mid.g + (this.colors.high.g - this.colors.mid.g) * s;
            b = this.colors.mid.b + (this.colors.high.b - this.colors.mid.b) * s;
        }

        return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    }

    /**
     * Render the GP field
     */
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#0a0a0f';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Sample and render the GP field as a grid of rectangles
        // Using slightly overlapping cells for smoother appearance
        const overlap = 1;

        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                const x = i * this.cellWidth;
                const y = j * this.cellHeight;

                // Sample GP at cell center
                const centerX = x + this.cellWidth / 2;
                const centerY = y + this.cellHeight / 2;
                const value = this.sampleGP(centerX, centerY);

                // Draw cell
                this.ctx.fillStyle = this.valueToColor(value);
                this.ctx.fillRect(
                    x - overlap,
                    y - overlap,
                    this.cellWidth + overlap * 2,
                    this.cellHeight + overlap * 2
                );
            }
        }

        // Add subtle vignette effect
        this.addVignette();
    }

    /**
     * Add vignette overlay for visual polish
     */
    addVignette() {
        const gradient = this.ctx.createRadialGradient(
            this.width / 2, this.height / 2, 0,
            this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.7
        );
        gradient.addColorStop(0, 'rgba(10, 10, 15, 0)');
        gradient.addColorStop(1, 'rgba(10, 10, 15, 0.4)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    /**
     * Animation loop
     */
    animate() {
        // Use real time for smooth, consistent animation
        this.time = performance.now() - this.startTime;
        this.render();
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    /**
     * Clean up
     */
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        window.removeEventListener('resize', this.resize);
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

        // Close menu when clicking a link
        menu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                toggle.classList.remove('active');
                menu.classList.remove('active');
            });
        });
    }

    // Navbar background on scroll
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.style.background = 'rgba(10, 10, 15, 0.95)';
            } else {
                navbar.style.background = 'rgba(10, 10, 15, 0.8)';
            }
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
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// ============================================
// Contact Form
// ============================================

function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        // Get form data
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        // Here you would typically send this to a server
        // For now, we'll just show a success message
        console.log('Form submitted:', data);

        // Show success feedback
        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.textContent = 'Message Sent!';
        btn.style.background = 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';

        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
            form.reset();
        }, 3000);
    });
}

// ============================================
// Intersection Observer for Animations
// ============================================

function initScrollAnimations() {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe elements that should animate on scroll
    document.querySelectorAll('.service-card, .feature, .expertise-list li').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// Add CSS for animated elements
const style = document.createElement('style');
style.textContent = `
    .animate-in {
        opacity: 1 !important;
        transform: translateY(0) !important;
    }
`;
document.head.appendChild(style);

// ============================================
// Initialize Everything
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize GP visualization
    const canvas = document.getElementById('gp-canvas');
    if (canvas) {
        new SpatialGPVisualizer(canvas);
    }

    // Initialize other components
    initNavigation();
    initSmoothScroll();
    initContactForm();
    initScrollAnimations();
});
