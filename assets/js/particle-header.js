// Particle Effect for Idealgniter Header
class ParticleHeader {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.mousePosition = { x: 0, y: 0 };
        this.isTouching = false;
        this.isMobile = window.innerWidth < 768;
        this.animationFrameId = null;
        this.textImageData = null;

        this.init();
    }

    async init() {
        // Wait for fonts to load with multiple strategies
        try {
            if (document.fonts && document.fonts.ready) {
                console.log('Waiting for fonts...');
                await Promise.race([
                    document.fonts.ready,
                    new Promise(resolve => setTimeout(resolve, 1000))
                ]);
                console.log('Fonts ready');
            } else {
                // Fallback delay if fonts API not available
                await new Promise(resolve => setTimeout(resolve, 800));
            }
        } catch (e) {
            console.warn('Font loading error:', e);
            await new Promise(resolve => setTimeout(resolve, 800));
        }

        this.updateCanvasSize();
        this.setupEventListeners();
        const scale = this.createTextImage();

        if (this.particles.length === 0) {
            console.log('Creating initial particles...');
            this.createInitialParticles(scale);
        }

        console.log(`Particle count: ${this.particles.length}`);

        if (this.particles.length === 0) {
            console.error('NO PARTICLES CREATED! Text may not have rendered.');
            // Try again after another delay
            setTimeout(() => {
                console.log('Retrying particle creation...');
                const retryScale = this.createTextImage();
                this.createInitialParticles(retryScale);
                console.log(`Retry particle count: ${this.particles.length}`);
                if (this.particles.length > 0) {
                    this.animate(retryScale);
                }
            }, 1000);
        } else {
            this.animate(scale);
        }
    }

    updateCanvasSize() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.isMobile = window.innerWidth < 768;

        console.log(`Canvas size: ${this.canvas.width}x${this.canvas.height}`);
    }

    createTextImage() {
        // Clear canvas first
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'white';
        this.ctx.save();

        // Calculate text size and position - slightly larger and bolder
        const fontSize = this.isMobile ? 42 : 68;
        this.ctx.font = `900 ${fontSize}px "Poppins", -apple-system, BlinkMacSystemFont, sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        const text = 'IDEAIGNITER';
        const x = this.canvas.width / 2;
        const y = this.canvas.height / 2;

        // Draw text with stroke for more definition
        this.ctx.lineWidth = this.isMobile ? 1 : 2;
        this.ctx.strokeStyle = 'white';
        this.ctx.strokeText(text, x, y);
        this.ctx.fillText(text, x, y);

        console.log(`Drew text at ${x}, ${y} with font size ${fontSize}`);

        // Draw the flame emoji/icon above - slightly larger
        const iconSize = this.isMobile ? 36 : 52;
        this.ctx.font = `${iconSize}px Arial, sans-serif`;
        this.ctx.fillText('🔥', x, y - fontSize * 0.7);

        this.ctx.restore();

        // Get image data
        this.textImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

        // Count white pixels
        let pixelCount = 0;
        const data = this.textImageData.data;
        for (let i = 3; i < data.length; i += 4) {
            if (data[i] > 128) pixelCount++;
        }
        console.log(`Text pixels found: ${pixelCount}`);

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        return fontSize / 68; // Return scale factor
    }

    createParticle(scale) {
        if (!this.textImageData) return null;

        const data = this.textImageData.data;

        // Try to find a valid pixel in the text
        for (let attempt = 0; attempt < 100; attempt++) {
            const x = Math.floor(Math.random() * this.canvas.width);
            const y = Math.floor(Math.random() * this.canvas.height);

            // Check if this pixel is part of the text (alpha > 128)
            if (data[(y * this.canvas.width + x) * 4 + 3] > 128) {
                // Check if this is in the flame emoji area (top part)
                const isFlameArea = y < this.canvas.height / 2 - (this.isMobile ? 20 : 30);

                return {
                    x: x,
                    y: y,
                    baseX: x,
                    baseY: y,
                    size: Math.random() * 2 + 1, // Slightly larger particles
                    color: 'white',
                    scatteredColor: isFlameArea ? '#FF6B35' : '#F7931E', // Orange flame colors
                    isFlame: isFlameArea,
                    life: Math.random() * 100 + 50
                };
            }
        }

        return null;
    }

    createInitialParticles(scale) {
        // Increased particle count for better readability
        const baseParticleCount = this.isMobile ? 4500 : 8000;
        const particleCount = Math.floor(baseParticleCount * Math.sqrt((this.canvas.width * this.canvas.height) / (1920 * 1080)));

        for (let i = 0; i < particleCount; i++) {
            const particle = this.createParticle(scale);
            if (particle) this.particles.push(particle);
        }
    }

    animate(scale) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Dark gradient background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#0a0a0a');
        gradient.addColorStop(1, '#1a1a2e');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const { x: mouseX, y: mouseY } = this.mousePosition;
        const maxDistance = this.isMobile ? 100 : 150; // Reduced scatter distance for readability

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            const dx = mouseX - p.x;
            const dy = mouseY - p.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < maxDistance && (this.isTouching || !('ontouchstart' in window))) {
                const force = (maxDistance - distance) / maxDistance;
                const angle = Math.atan2(dy, dx);
                const moveX = Math.cos(angle) * force * 35; // Less movement = more readable
                const moveY = Math.sin(angle) * force * 35;
                p.x = p.baseX - moveX;
                p.y = p.baseY - moveY;

                this.ctx.fillStyle = p.scatteredColor;
                // Add slight glow effect for scattered particles
                this.ctx.shadowBlur = 3;
                this.ctx.shadowColor = p.scatteredColor;
            } else {
                p.x += (p.baseX - p.x) * 0.12; // Slightly faster return to position
                p.y += (p.baseY - p.y) * 0.12;
                this.ctx.fillStyle = 'white';
                this.ctx.shadowBlur = 0;
            }

            this.ctx.fillRect(p.x, p.y, p.size, p.size);

            p.life--;
            if (p.life <= 0) {
                const newParticle = this.createParticle(scale);
                if (newParticle) {
                    this.particles[i] = newParticle;
                } else {
                    this.particles.splice(i, 1);
                    i--;
                }
            }
        }

        // Maintain particle count
        const baseParticleCount = this.isMobile ? 4500 : 8000;
        const targetParticleCount = Math.floor(baseParticleCount * Math.sqrt((this.canvas.width * this.canvas.height) / (1920 * 1080)));
        while (this.particles.length < targetParticleCount) {
            const newParticle = this.createParticle(scale);
            if (newParticle) this.particles.push(newParticle);
        }

        this.animationFrameId = requestAnimationFrame(() => this.animate(scale));
    }

    setupEventListeners() {
        const handleResize = () => {
            this.updateCanvasSize();
            const newScale = this.createTextImage();
            this.particles = [];
            this.createInitialParticles(newScale);
        };

        const handleMove = (x, y) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePosition = {
                x: x - rect.left,
                y: y - rect.top
            };
        };

        const handleMouseMove = (e) => {
            handleMove(e.clientX, e.clientY);
        };

        const handleTouchMove = (e) => {
            if (e.touches.length > 0) {
                e.preventDefault();
                handleMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        };

        const handleTouchStart = () => {
            this.isTouching = true;
        };

        const handleTouchEnd = () => {
            this.isTouching = false;
            this.mousePosition = { x: 0, y: 0 };
        };

        const handleMouseLeave = () => {
            if (!('ontouchstart' in window)) {
                this.mousePosition = { x: 0, y: 0 };
            }
        };

        window.addEventListener('resize', handleResize);
        this.canvas.addEventListener('mousemove', handleMouseMove);
        this.canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        this.canvas.addEventListener('mouseleave', handleMouseLeave);
        this.canvas.addEventListener('touchstart', handleTouchStart);
        this.canvas.addEventListener('touchend', handleTouchEnd);

        // Store cleanup function
        this.cleanup = () => {
            window.removeEventListener('resize', handleResize);
            this.canvas.removeEventListener('mousemove', handleMouseMove);
            this.canvas.removeEventListener('touchmove', handleTouchMove);
            this.canvas.removeEventListener('mouseleave', handleMouseLeave);
            this.canvas.removeEventListener('touchstart', handleTouchStart);
            this.canvas.removeEventListener('touchend', handleTouchEnd);
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
            }
        };
    }

    destroy() {
        if (this.cleanup) {
            this.cleanup();
        }
    }
}

// Auto-initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initParticleHeader);
} else {
    // DOM already loaded
    initParticleHeader();
}

function initParticleHeader() {
    console.log('Initializing particle header...');
    const headerCanvas = document.getElementById('particleHeaderCanvas');
    if (headerCanvas) {
        console.log('Canvas found, creating ParticleHeader');
        window.particleHeader = new ParticleHeader('particleHeaderCanvas');
    } else {
        console.error('Canvas element not found!');
    }
}
