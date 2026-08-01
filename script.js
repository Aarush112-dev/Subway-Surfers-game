/**
 * Subway Surfers 3D Clone
 * Uses Three.js for WebGL Rendering
 */

// --- Constants & Config ---
const CONFIG = {
    FPS: 60,
    LANE_COUNT: 3,
    LANE_WIDTH: 3,
    START_SPEED: 25, // Z-units per second
    MAX_SPEED: 60,
    SPEED_INC: 0.5,
    RENDER_DISTANCE: 150,
    GRAVITY: 40,
    JUMP_FORCE: 15,
    SLIDE_DURATION: 0.8,
    COLORS: {
        sky: '#4fc3f7',      // Vibrant sky blue
        ground: '#81c784',   // Bright green grass
        track: '#e0e0e0',    // Light concrete track
        player: '#ff3366',
        coin: '#ffd700'
    }
};

// --- InputHandler ---
class InputHandler {
    constructor() {
        this.keys = {};
        this.swipeDir = null;
        
        // Touch state
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchThreshold = 30;

        window.addEventListener('keydown', e => this.keys[e.code] = true);
        window.addEventListener('keyup', e => this.keys[e.code] = false);

        const canvas = document.getElementById('game-canvas');
        canvas.addEventListener('touchstart', e => {
            this.touchStartX = e.changedTouches[0].screenX;
            this.touchStartY = e.changedTouches[0].screenY;
        }, {passive: true});

        canvas.addEventListener('touchend', e => {
            const touchEndX = e.changedTouches[0].screenX;
            const touchEndY = e.changedTouches[0].screenY;
            this.handleSwipe(touchEndX, touchEndY);
        }, {passive: true});
    }

    handleSwipe(endX, endY) {
        const dx = endX - this.touchStartX;
        const dy = endY - this.touchStartY;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            if (Math.abs(dx) > this.touchThreshold) {
                this.swipeDir = dx > 0 ? 'RIGHT' : 'LEFT';
            }
        } else {
            if (Math.abs(dy) > this.touchThreshold) {
                this.swipeDir = dy > 0 ? 'DOWN' : 'UP';
            }
        }
    }

    consumeKey(code) {
        if (this.keys[code]) {
            this.keys[code] = false;
            return true;
        }
        return false;
    }

    consumeSwipe(dir) {
        if (this.swipeDir === dir) {
            this.swipeDir = null;
            return true;
        }
        return false;
    }
}

// --- SoundManager ---
class SoundManager {
    constructor() { 
        this.enabled = true; 
        // Simple synth for sound effects and music
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.musicPlaying = false;
        this.nextNoteTime = 0;
        this.current16thNote = 0;
    }
    
    startMusic() {
        if (!this.enabled || !this.audioCtx) return;
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        if (this.musicPlaying) return;
        
        this.musicPlaying = true;
        this.nextNoteTime = this.audioCtx.currentTime + 0.1;
        this.current16thNote = 0;
        this.scheduler();
    }
    
    stopMusic() {
        this.musicPlaying = false;
        if (this.musicTimer) {
            clearTimeout(this.musicTimer);
        }
    }

    scheduler() {
        if (!this.musicPlaying) return;
        
        // Schedule notes ahead of time
        while (this.nextNoteTime < this.audioCtx.currentTime + 0.1) {
            this.scheduleNote(this.current16thNote, this.nextNoteTime);
            this.nextNoteTime += 0.15; // Tempo controls speed of music
            this.current16thNote = (this.current16thNote + 1) % 16;
        }
        this.musicTimer = setTimeout(() => this.scheduler(), 25);
    }

    scheduleNote(beatNumber, time) {
        // Kick Drum every downbeat
        if (beatNumber % 4 === 0) {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.frequency.setValueAtTime(150, time);
            osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
            gain.gain.setValueAtTime(0.5, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
            osc.start(time);
            osc.stop(time + 0.5);
        }
        
        // Catchy 8-bit Bassline progression
        const bassNotes = [261.63, 261.63, 311.13, 311.13, 349.23, 349.23, 233.08, 233.08]; // C, Eb, F, Bb
        const note = bassNotes[Math.floor(beatNumber / 2) % bassNotes.length];
        
        if (beatNumber % 2 === 0 || beatNumber % 8 === 7) {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'square';
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.frequency.setValueAtTime(note / 2, time); // Play one octave lower
            gain.gain.setValueAtTime(0.1, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
            osc.start(time);
            osc.stop(time + 0.15);
        }
    }

    play(soundName) {
        if (!this.enabled || !this.audioCtx) return;
        
        // Resume AudioContext if suspended (browser policy)
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        
        let now = this.audioCtx.currentTime;

        if (soundName === 'jump') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.2);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (soundName === 'slide') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (soundName === 'coin') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.setValueAtTime(1200, now + 0.1);
            gain.gain.setValueAtTime(0.05, now);  // Quieter coin sound
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (soundName === 'crash') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.5);
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
        }
    }
}

// --- Player (3D) ---
class Player {
    constructor(scene) {
        this.lane = 1; // 0: Left, 1: Middle, 2: Right
        this.y = 0;
        this.vy = 0;
        this.isJumping = false;
        this.isSliding = false;
        this.slideTimer = 0;
        this.targetX = 0;
        this.animTime = 0;

        // Build 3D Mesh
        this.group = new THREE.Group();
        this.group.position.set(0, 0, 0); // Player stays at Z=0

        // Materials
        const bodyMat = new THREE.MeshStandardMaterial({ color: CONFIG.COLORS.player, roughness: 0.7 });
        const skinMat = new THREE.MeshStandardMaterial({ color: '#ffccaa', roughness: 0.5 });
        const darkMat = new THREE.MeshStandardMaterial({ color: '#222', roughness: 0.8 });

        // Body
        this.body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.6), bodyMat);
        this.body.position.y = 1.1;
        this.body.castShadow = true;
        this.group.add(this.body);

        // Head
        this.head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), skinMat);
        this.head.position.y = 1.9;
        this.head.castShadow = true;
        this.group.add(this.head);

        // Cap
        this.cap = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.2, 0.7), darkMat);
        this.cap.position.set(0, 2.2, -0.15); // Offset to -z so it faces away
        this.group.add(this.cap);

        // Limbs (Arms and Legs)
        this.limbs = [];
        const limbGeo = new THREE.BoxGeometry(0.25, 0.8, 0.25);
        
        // Left Arm
        this.lArm = new THREE.Mesh(limbGeo, skinMat);
        this.lArm.position.set(-0.55, 1.1, 0);
        this.lArm.castShadow = true;
        this.group.add(this.lArm);
        this.limbs.push({ mesh: this.lArm, mult: 1, type: 'arm' });

        // Right Arm
        this.rArm = new THREE.Mesh(limbGeo, skinMat);
        this.rArm.position.set(0.55, 1.1, 0);
        this.rArm.castShadow = true;
        this.group.add(this.rArm);
        this.limbs.push({ mesh: this.rArm, mult: -1, type: 'arm' });

        // Left Leg
        const pantsMat = new THREE.MeshStandardMaterial({ color: '#3333cc' });
        this.lLeg = new THREE.Mesh(limbGeo, pantsMat);
        this.lLeg.position.set(-0.25, 0.4, 0);
        this.lLeg.castShadow = true;
        this.group.add(this.lLeg);
        this.limbs.push({ mesh: this.lLeg, mult: -1, type: 'leg' });

        // Right Leg
        this.rLeg = new THREE.Mesh(limbGeo, pantsMat);
        this.rLeg.position.set(0.25, 0.4, 0);
        this.rLeg.castShadow = true;
        this.group.add(this.rLeg);
        this.limbs.push({ mesh: this.rLeg, mult: 1, type: 'leg' });

        scene.add(this.group);
    }

    reset() {
        this.lane = 1;
        this.y = 0;
        this.vy = 0;
        this.isJumping = false;
        this.isSliding = false;
        this.targetX = 0;
        this.animTime = 0;
        this.group.position.set(0, 0, 0);
        this.group.rotation.set(0, 0, 0);
        this.group.scale.set(1, 1, 1);
    }

    update(dt, input, soundManager) {
        this.animTime += dt;

        // Lane changing
        if (input.consumeKey('ArrowLeft') || input.consumeKey('KeyA') || input.consumeSwipe('LEFT')) {
            if (this.lane > 0) { this.lane--; soundManager.play('move'); }
        }
        if (input.consumeKey('ArrowRight') || input.consumeKey('KeyD') || input.consumeSwipe('RIGHT')) {
            if (this.lane < 2) { this.lane++; soundManager.play('move'); }
        }

        // Target X based on lane
        this.targetX = (this.lane - 1) * CONFIG.LANE_WIDTH;
        
        // Smooth horizontal movement
        this.group.position.x += (this.targetX - this.group.position.x) * 15 * dt;

        // Jumping
        if ((input.consumeKey('ArrowUp') || input.consumeKey('KeyW') || input.consumeKey('Space') || input.consumeSwipe('UP')) && !this.isJumping && !this.isSliding) {
            this.vy = CONFIG.JUMP_FORCE;
            this.isJumping = true;
            soundManager.play('jump');
        }

        // Sliding — flatten the player aggressively to fit under arches
        if ((input.consumeKey('ArrowDown') || input.consumeKey('KeyS') || input.consumeSwipe('DOWN')) && !this.isJumping && !this.isSliding) {
            this.isSliding = true;
            this.slideTimer = 1.0; // Extended slide duration
            this.group.scale.y = 0.35; // Squish hard
            this.group.position.y = -0.5; // Sink into ground
            soundManager.play('slide');
        }

        // Apply Gravity
        if (this.isJumping) {
            this.vy -= CONFIG.GRAVITY * dt;
            this.y += this.vy * dt;
            
            if (this.y <= 0) {
                this.y = 0;
                this.isJumping = false;
                this.vy = 0;
            }
        }
        
        if (!this.isSliding) {
            this.group.position.y = this.y;
        }

        // Slide logic
        if (this.isSliding) {
            this.slideTimer -= dt;
            if (this.slideTimer <= 0) {
                this.isSliding = false;
                this.group.scale.y = 1;
                this.group.position.y = this.y;
            }
        }

        // Animations (Run Cycle)
        let swing = 0;
        if (!this.isJumping && !this.isSliding) {
            swing = Math.sin(this.animTime * 15);
            this.body.rotation.y = swing * 0.1;
            this.head.rotation.y = swing * 0.05;
        } else if (this.isJumping) {
            swing = 0.5; // Fixed pose
        } else if (this.isSliding) {
            swing = 0.2;
        }

        for (let l of this.limbs) {
            if (l.type === 'arm') {
                l.mesh.rotation.x = swing * l.mult * 1.5;
            } else {
                l.mesh.rotation.x = -swing * l.mult * 1.5;
            }
        }
    }

    getBounds() {
        return new THREE.Box3().setFromObject(this.group);
    }
}

// --- Obstacles & Coins (3D) ---
class GameObject {
    constructor(scene) {
        this.scene = scene;
        this.active = false;
        this.group = new THREE.Group();
        this.type = 'normal';
        this.scene.add(this.group);
        this.group.visible = false;
    }
    
    spawn(lane, z, type = 'normal') {
        this.active = true;
        this.type = type;
        this.group.visible = true;
        let x = (lane - 1) * CONFIG.LANE_WIDTH;
        this.group.position.set(x, 0, -z); // Spawn far away (negative Z)
    }

    update(dt, speed) {
        if (!this.active) return;
        this.group.position.z += speed * dt; // Move towards camera (Z=0)
        if (this.group.position.z > 10) { // Past camera
            this.active = false;
            this.group.visible = false;
        }
    }

    getBounds() {
        return new THREE.Box3().setFromObject(this.group);
    }
}

class Obstacle extends GameObject {
    constructor(scene) {
        super(scene);
        
        // We will build different meshes and toggle visibility based on type
        this.meshes = {};

        // 1. Train Mesh — variable length set at spawn time
        const trainMat = new THREE.MeshStandardMaterial({ color: '#e63946', roughness: 0.6 });
        const trainGroup = new THREE.Group();
        
        // Body mesh — length will be set in spawn()
        this.trainBody = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.5, 1), trainMat);
        this.trainBody.position.y = 1.75;
        this.trainBody.castShadow = true;
        this.trainBody.receiveShadow = true;
        trainGroup.add(this.trainBody);
        
        // Windows strip
        const winMat = new THREE.MeshStandardMaterial({ color: '#1d3557' });
        this.trainWindow = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 1), winMat);
        this.trainWindow.position.y = 2.4;
        trainGroup.add(this.trainWindow);
        
        // Headlight (front face)
        const lightMat = new THREE.MeshStandardMaterial({ color: '#ffffaa', emissive: '#ffff44', emissiveIntensity: 0.8 });
        this.trainLight = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.15), lightMat);
        this.trainLight.position.set(0, 1.0, 0); // positioned at front in spawn()
        trainGroup.add(this.trainLight);
        
        this.meshes['train'] = trainGroup;
        this.group.add(trainGroup);

        // 2. Barrier (Low)
        const barrierGroup = new THREE.Group();
        const barMat = new THREE.MeshStandardMaterial({ color: '#ff9f1c' });
        const legMat = new THREE.MeshStandardMaterial({ color: '#555555' });
        const barBoard = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.8, 0.2), barMat);
        barBoard.position.y = 0.6;
        barBoard.castShadow = true;
        barrierGroup.add(barBoard);
        
        const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.0, 0.2), legMat);
        lLeg.position.set(-1.2, 0.5, 0);
        barrierGroup.add(lLeg);
        
        const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.0, 0.2), legMat);
        rLeg.position.set(1.2, 0.5, 0);
        barrierGroup.add(rLeg);

        this.meshes['barrier'] = barrierGroup;
        this.meshes['low'] = barrierGroup;
        this.group.add(barrierGroup);

        // 3. High Obstacle — Red ARCH with a slide-through gap beneath
        // Structure: a wide top bar + two thick side pillars.
        // The gap between the ground and the bottom of the top bar is ~1.4 units,
        // just enough to slide under when crouched.
        const highGroup = new THREE.Group();
        const archMat = new THREE.MeshStandardMaterial({ color: '#ff1744', roughness: 0.4, emissive: '#7f0b1e', emissiveIntensity: 0.3 });
        const warnMat = new THREE.MeshStandardMaterial({ color: '#ffff00', roughness: 0.5 }); // yellow warning stripe

        // Top bar (spans full lane width)
        const topBar = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.0, 0.6), archMat);
        topBar.position.y = 2.8;  // Clearly above standing player (slide under this)
        topBar.castShadow = true;
        highGroup.add(topBar);

        // Yellow warning stripe on the top bar
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.21, 0.18, 0.61), warnMat);
        stripe.position.y = 2.35;  // bottom edge of top bar
        highGroup.add(stripe);

        // Left pillar (decorative only — no collision)
        const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.4, 0.6), archMat);
        leftPillar.position.set(-1.35, 1.2, 0);
        leftPillar.castShadow = true;
        highGroup.add(leftPillar);

        // Right pillar (decorative only — no collision)
        const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.4, 0.6), archMat);
        rightPillar.position.set(1.35, 1.2, 0);
        rightPillar.castShadow = true;
        highGroup.add(rightPillar);

        // Store reference to just the top bar — pillars are purely decorative
        this.highTopBar = topBar;

        this.meshes['high'] = highGroup;
        this.group.add(highGroup);
    }

    spawn(lane, z, type = 'barrier') {
        super.spawn(lane, z, type);
        
        // Hide all meshes first
        for (let key in this.meshes) {
            this.meshes[key].visible = false;
        }
        
        // Show correct mesh
        if (this.meshes[type]) {
            this.meshes[type].visible = true;
        }
        
        // For trains: randomise length between 5 and 16 units
        if (type === 'train') {
            const len = 5 + Math.random() * 11;
            this.trainBody.geometry.dispose();
            this.trainBody.geometry = new THREE.BoxGeometry(2.8, 3.5, len);
            this.trainWindow.geometry.dispose();
            this.trainWindow.geometry = new THREE.BoxGeometry(2.4, 1.2, len + 0.1);
            // Position headlight at the front face
            this.trainLight.position.set(0, 1.0, len / 2 + 0.08);
        }
    }

    getBounds() {
        let box = new THREE.Box3();
        if (this.type === 'high') {
            // For the arch, ONLY check the top bar — not the pillars.
            // This lets the player slide through the open gap beneath.
            if (this.highTopBar) {
                box.setFromObject(this.highTopBar);
            }
        } else if (this.meshes[this.type]) {
            box.setFromObject(this.meshes[this.type]);
        }
        return box;
    }
}

class Coin extends GameObject {
    constructor(scene) {
        super(scene);
        const geo = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16);
        const mat = new THREE.MeshStandardMaterial({ color: CONFIG.COLORS.coin, metalness: 0.2, roughness: 0.4 });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.rotation.x = Math.PI / 2; // Stand up
        this.mesh.position.y = 0.5;
        this.mesh.castShadow = true;
        this.group.add(this.mesh);
    }

    update(dt, speed) {
        super.update(dt, speed);
        if (this.active) {
            this.mesh.rotation.z += dt * 5; // Spin
        }
    }
}

// --- Object Pools ---
class Pool {
    constructor(createFunc, initialSize) {
        this.pool = [];
        for (let i=0; i<initialSize; i++) {
            this.pool.push(createFunc());
        }
    }
    get() {
        for (let obj of this.pool) {
            if (!obj.active) return obj;
        }
        return null;
    }
    getAllActive() {
        return this.pool.filter(o => o.active);
    }
    resetAll() {
        this.pool.forEach(o => {
            o.active = false;
            o.group.visible = false;
        });
    }
}

// --- Chaser (Inspector) ---
class Chaser {
    constructor(scene) {
        this.scene = scene;
        this.z = 18;       // Starts well behind the camera
        this.catchZ = 5.5; // If chaser reaches this Z, game over
        this.group = new THREE.Group();
        this.animTime = 0;

        const jacketMat = new THREE.MeshStandardMaterial({ color: '#003399', roughness: 0.7 });
        const skinMat   = new THREE.MeshStandardMaterial({ color: '#ffccaa', roughness: 0.5 });
        const hatMat    = new THREE.MeshStandardMaterial({ color: '#001166' });
        const pantsMat  = new THREE.MeshStandardMaterial({ color: '#222266' });
        const beltMat   = new THREE.MeshStandardMaterial({ color: '#8B6914' });

        // Body
        this.body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.65), jacketMat);
        this.body.position.y = 1.1;
        this.body.castShadow = true;
        this.group.add(this.body);

        // Belt
        const belt = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.18, 0.66), beltMat);
        belt.position.y = 0.62;
        this.group.add(belt);

        // Head
        this.head = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.65), skinMat);
        this.head.position.y = 1.95;
        this.head.castShadow = true;
        this.group.add(this.head);

        // Hat brim + top
        const hatBrim = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.9), hatMat);
        hatBrim.position.y = 2.32;
        this.group.add(hatBrim);
        const hatTop = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.38, 0.65), hatMat);
        hatTop.position.y = 2.56;
        this.group.add(hatTop);

        // Arms
        const armGeo = new THREE.BoxGeometry(0.28, 0.85, 0.28);
        this.lArm = new THREE.Mesh(armGeo, jacketMat);
        this.lArm.position.set(-0.62, 1.1, 0);
        this.lArm.castShadow = true;
        this.group.add(this.lArm);
        this.rArm = new THREE.Mesh(armGeo, jacketMat);
        this.rArm.position.set(0.62, 1.1, 0);
        this.rArm.castShadow = true;
        this.group.add(this.rArm);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.28, 0.85, 0.28);
        this.lLeg = new THREE.Mesh(legGeo, pantsMat);
        this.lLeg.position.set(-0.22, 0.42, 0);
        this.lLeg.castShadow = true;
        this.group.add(this.lLeg);
        this.rLeg = new THREE.Mesh(legGeo, pantsMat);
        this.rLeg.position.set(0.22, 0.42, 0);
        this.rLeg.castShadow = true;
        this.group.add(this.rLeg);

        this.group.position.set(0, 0, this.z);
        this.group.rotation.y = Math.PI; // Face toward player (-Z direction)
        scene.add(this.group);
    }

    reset() {
        this.z = 18;
        this.group.position.set(0, 0, this.z);
        this.group.visible = true;
    }

    hide() {
        this.group.visible = false;
    }

    update(dt, gameSpeed) {
        this.animTime += dt;

        // The chaser always crawls forward; gap closes faster at high speeds
        const approachRate = 1.5 + (gameSpeed - CONFIG.START_SPEED) * 0.04;
        this.z -= approachRate * dt;
        this.z = Math.max(this.z, this.catchZ - 0.5);
        this.group.position.z = this.z;

        // Running animation
        const swing = Math.sin(this.animTime * 18) * 0.9;
        this.lArm.rotation.x = swing;
        this.rArm.rotation.x = -swing;
        this.lLeg.rotation.x = -swing;
        this.rLeg.rotation.x = swing;
        this.body.rotation.y = Math.sin(this.animTime * 18) * 0.07;
    }

    // 0 = far away, 1 = caught
    catchProgress() {
        return Math.min(1, Math.max(0, (18 - this.z) / (18 - this.catchZ)));
    }

    isCaught() {
        return this.z <= this.catchZ;
    }
}

// --- UI Manager ---
class UI {
    constructor() {
        this.els = {
            hud: document.getElementById('hud'),
            score: document.getElementById('score-display'),
            coins: document.getElementById('coins-display'),
            multiplier: document.getElementById('multiplier-display'),
            multiplierBox: document.getElementById('multiplier-box'),
            mainMenu: document.getElementById('main-menu'),
            pauseMenu: document.getElementById('pause-menu'),
            gameOverMenu: document.getElementById('game-over-menu'),
            menuHighScore: document.getElementById('menu-high-score'),
            finalScore: document.getElementById('final-score'),
            finalHighScore: document.getElementById('final-high-score'),
            finalCoins: document.getElementById('final-coins'),
            container: document.getElementById('game-container')
        };
        
        this.scores = JSON.parse(localStorage.getItem('subwayCloneScores3D')) || [];
        this.highScore = this.scores.length > 0 ? this.scores[0] : 0;
        this.els.menuHighScore.innerText = this.highScore;
        this.renderLeaderboard();
    }

    renderLeaderboard() {
        let lbHtml = "<h3 style='margin-bottom: 5px; color: var(--secondary-color);'>LEADERBOARD</h3>";
        if (this.scores.length === 0) lbHtml += "<p>No scores yet!</p>";
        for (let i = 0; i < Math.min(5, this.scores.length); i++) {
            lbHtml += `<div style="display:flex; justify-content:space-between; width:200px; margin: 0 auto; color:rgba(255,255,255,0.8);"><span>#${i+1}</span> <span style="color:var(--text-color); font-weight:bold;">${this.scores[i]}</span></div>`;
        }
        let lbDiv = document.getElementById('leaderboard-display');
        if (lbDiv) lbDiv.innerHTML = lbHtml;
    }

    updateHUD(score, coins, multiplier, catchProgress) {
        this.els.score.innerText = Math.floor(score);
        this.els.coins.innerText = coins;
        if (multiplier > 1) {
            this.els.multiplierBox.style.display = 'flex';
            this.els.multiplier.innerText = 'x' + multiplier.toFixed(1);
        }
        // Update danger bar
        const bar = document.getElementById('danger-bar-fill');
        const label = document.getElementById('danger-label');
        if (bar && catchProgress !== undefined) {
            const pct = Math.round(catchProgress * 100);
            bar.style.width = pct + '%';
            // Colour shifts from green -> yellow -> red
            const hue = Math.round(120 - catchProgress * 120);
            bar.style.background = `hsl(${hue}, 100%, 45%)`;
            if (catchProgress > 0.7) {
                label.style.color = '#ff4444';
                label.style.animation = 'pulse 0.5s infinite alternate';
            } else {
                label.style.color = '#fff';
                label.style.animation = 'none';
            }
        }
    }

    showMainMenu() {
        this.hideAll();
        this.els.mainMenu.classList.remove('hidden');
        this.els.mainMenu.classList.add('active');
        this.els.menuHighScore.innerText = this.highScore;
    }

    showHUD() {
        this.hideAll();
        this.els.hud.classList.remove('hidden');
    }

    showPause() { 
        this.els.pauseMenu.classList.remove('hidden');
        this.els.pauseMenu.classList.add('active');
    }
    hidePause() { 
        this.els.pauseMenu.classList.add('hidden');
        this.els.pauseMenu.classList.remove('active');
    }

    showGameOver(score, coins) {
        this.hideAll();
        this.els.gameOverMenu.classList.remove('hidden');
        this.els.gameOverMenu.classList.add('active');
        
        let finalScore = Math.floor(score);
        this.scores.push(finalScore);
        this.scores.sort((a,b) => b - a); // descending
        this.scores = this.scores.slice(0, 10); // keep top 10
        localStorage.setItem('subwayCloneScores3D', JSON.stringify(this.scores));
        this.highScore = this.scores[0];

        this.els.finalScore.innerText = finalScore;
        this.els.finalHighScore.innerText = this.highScore;
        this.els.finalCoins.innerText = coins;
        this.els.container.classList.add('screen-shake');
        setTimeout(() => this.els.container.classList.remove('screen-shake'), 500);
    }

    hideAll() {
        this.els.hud.classList.add('hidden');
        this.els.mainMenu.classList.add('hidden');
        this.els.mainMenu.classList.remove('active');
        this.els.pauseMenu.classList.add('hidden');
        this.els.pauseMenu.classList.remove('active');
        this.els.gameOverMenu.classList.add('hidden');
        this.els.gameOverMenu.classList.remove('active');
    }
}

// --- Main Game Engine (Three.js) ---
class Game {
    constructor() {
        // Init Three.js
        this.canvas = document.getElementById('game-canvas');
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(CONFIG.COLORS.sky);
        this.scene.fog = new THREE.FogExp2(CONFIG.COLORS.sky, 0.015);
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 300);
        this.camera.position.set(0, 4, 7); // Behind and above player
        this.camera.lookAt(0, 1, -20); // Look down track

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Increased ambient light
        this.scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
        dirLight.position.set(20, 40, 10);
        dirLight.castShadow = true;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 150;
        dirLight.shadow.camera.left = -15;
        dirLight.shadow.camera.right = 15;
        dirLight.shadow.camera.top = 100;
        dirLight.shadow.camera.bottom = -20;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        this.scene.add(dirLight);

        // Core systems
        this.input = new InputHandler();
        this.sound = new SoundManager();
        this.ui = new UI();
        
        // Environment
        this.buildEnvironment();

        // Game Objects
        this.player = new Player(this.scene);
        this.obstaclePool = new Pool(() => new Obstacle(this.scene), 30);
        this.coinPool = new Pool(() => new Coin(this.scene), 50);
        this.chaser = new Chaser(this.scene);
        this.chaser.hide(); // Hidden until game starts

        // State
        this.state = 'MENU';
        this.score = 0;
        this.coins = 0;
        this.speed = CONFIG.START_SPEED;
        this.distance = 0;
        
        this.lastTime = 0;
        this.spawnTimer = 0;
        this.difficultyMultiplier = 1;

        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Buttons binding
        document.getElementById('play-btn').addEventListener('click', () => this.start());
        document.getElementById('restart-btn').addEventListener('click', () => this.start());
        document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('resume-btn').addEventListener('click', () => this.togglePause());

        // Start Loop
        requestAnimationFrame((t) => this.loop(t));
    }

    buildEnvironment() {
        // Ground Plane
        const groundGeo = new THREE.PlaneGeometry(200, 1000);
        const groundMat = new THREE.MeshStandardMaterial({ color: CONFIG.COLORS.ground });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.z = -400;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Track Plane
        const trackGeo = new THREE.PlaneGeometry(CONFIG.LANE_WIDTH * 3 + 1, 1000);
        const trackMat = new THREE.MeshStandardMaterial({ color: CONFIG.COLORS.track });
        const track = new THREE.Mesh(trackGeo, trackMat);
        track.rotation.x = -Math.PI / 2;
        track.position.y = 0.01; // slightly above ground to prevent z-fighting
        track.position.z = -400;
        track.receiveShadow = true;
        this.scene.add(track);

        // Moving elements (Sleepers/Lines) to simulate speed
        this.sceneryGroup = new THREE.Group();
        this.scene.add(this.sceneryGroup);

        const sleeperGeo = new THREE.BoxGeometry(CONFIG.LANE_WIDTH * 3 + 1.2, 0.1, 0.5);
        const sleeperMat = new THREE.MeshStandardMaterial({ color: '#ffffff' }); // Bright white sleepers

        this.sleepers = [];
        for (let i = 0; i < 40; i++) {
            let s = new THREE.Mesh(sleeperGeo, sleeperMat);
            s.position.set(0, 0.05, -i * 5);
            s.receiveShadow = true;
            this.sceneryGroup.add(s);
            this.sleepers.push(s);
        }

        // Side Walls / Pillars
        const pillarGeo = new THREE.BoxGeometry(1, 10, 2);
        const pillarMat = new THREE.MeshStandardMaterial({ color: '#b0bec5' }); // Light bright grey
        this.pillars = [];
        for (let i = 0; i < 20; i++) {
            let pL = new THREE.Mesh(pillarGeo, pillarMat);
            pL.position.set(-7, 5, -i * 15);
            pL.castShadow = true;
            pL.receiveShadow = true;
            this.sceneryGroup.add(pL);
            this.pillars.push(pL);

            let pR = new THREE.Mesh(pillarGeo, pillarMat);
            pR.position.set(7, 5, -i * 15);
            pR.castShadow = true;
            pR.receiveShadow = true;
            this.sceneryGroup.add(pR);
            this.pillars.push(pR);
        }
    }

    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    start() {
        this.state = 'PLAYING';
        this.score = 0;
        this.coins = 0;
        this.distance = 0;
        this.speed = CONFIG.START_SPEED;
        this.difficultyMultiplier = 1;
        this.spawnTimer = 0;
        
        this.player.reset();
        this.chaser.reset();
        this.obstaclePool.resetAll();
        this.coinPool.resetAll();
        
        this.ui.showHUD();
        this.sound.startMusic();
        this.lastTime = performance.now();
    }

    togglePause() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            this.ui.showPause();
        } else if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            this.ui.hidePause();
            this.lastTime = performance.now();
        }
    }

    gameOver(reason) {
        this.state = 'GAMEOVER';
        this.chaser.hide();
        this.sound.stopMusic();
        this.sound.play('crash');
        this.ui.showGameOver(this.score, this.coins);
    }

    spawnEntities() {
        let spawnZ = CONFIG.RENDER_DISTANCE;
        
        // Spawn Obstacles
        let obsCount = Math.floor(Math.random() * 2) + 1;
        let lanes = [0, 1, 2];
        lanes.sort(() => Math.random() - 0.5);

        for (let i=0; i<obsCount; i++) {
            let obs = this.obstaclePool.get();
            if (obs) {
                let r = Math.random();
                let type = 'barrier';
                if (r < 0.2) type = 'train';
                else if (r < 0.5) type = 'low';
                else if (r < 0.7) type = 'high';
                
                obs.spawn(lanes[i], spawnZ, type);
            }
        }

        // Spawn Coins
        let coinLane = lanes[2]; // Remaining lane
        for(let j=0; j<5; j++) {
            let coin = this.coinPool.get();
            if (coin) {
                coin.spawn(coinLane, spawnZ + j * 4);
            }
        }
    }

    update(dt) {
        if (this.input.consumeKey('KeyP')) this.togglePause();

        if (this.state !== 'PLAYING') return;

        // Difficulty scaling
        this.speed += CONFIG.SPEED_INC * dt;
        if (this.speed > CONFIG.MAX_SPEED) this.speed = CONFIG.MAX_SPEED;
        this.difficultyMultiplier = this.speed / CONFIG.START_SPEED;

        this.distance += this.speed * dt;
        this.score += this.speed * dt * 0.1;

        // Scenery Scrolling
        let moveAmt = this.speed * dt;
        for (let s of this.sleepers) {
            s.position.z += moveAmt;
            if (s.position.z > 10) s.position.z -= 40 * 5; // Loop back
        }
        for (let p of this.pillars) {
            p.position.z += moveAmt;
            if (p.position.z > 10) p.position.z -= 20 * 15;
        }

        // Spawning
        this.spawnTimer -= dt;
        let spawnInterval = 1.0 / this.difficultyMultiplier;
        if (this.spawnTimer <= 0) {
            this.spawnEntities();
            this.spawnTimer = spawnInterval;
        }

        // Update player
        this.player.update(dt, this.input, this.sound);
        let pBounds = this.player.getBounds();

        // Shrink player hit box slightly to make it forgiving
        pBounds.expandByScalar(-0.2);

        // Update obstacles
        let obstacles = this.obstaclePool.getAllActive();
        for (let obs of obstacles) {
            obs.update(dt, this.speed);
            
            // Collision (AABB)
            if (obs.group.position.z > -10 && obs.group.position.z < 5) {
                let oBounds = obs.getBounds();
                if (pBounds.intersectsBox(oBounds)) {
                    this.gameOver();
                }
            }
        }

        // Update coins
        let coins = this.coinPool.getAllActive();
        for (let coin of coins) {
            coin.update(dt, this.speed);
            
            // Collection
            if (coin.group.position.z > -5 && coin.group.position.z < 5) {
                let cBounds = coin.getBounds();
                if (pBounds.intersectsBox(cBounds)) {
                    coin.active = false;
                    coin.group.visible = false;
                    this.coins++;
                    this.score += 10;
                    this.sound.play('coin');
                }
            }
        }

        // Update chaser
        this.chaser.update(dt, this.speed);
        if (this.chaser.isCaught()) {
            this.gameOver('chaser');
            return;
        }

        this.ui.updateHUD(this.score, this.coins, this.difficultyMultiplier, this.chaser.catchProgress());
    }

    draw() {
        // Idle animation for menu
        if (this.state === 'MENU') {
            this.player.animTime += 0.016;
            this.player.update(0, this.input, this.sound); // force update animations without input
        }

        this.renderer.render(this.scene, this.camera);
    }

    loop(timestamp) {
        let dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        
        if (dt > 0.1) dt = 0.1;

        this.update(dt);
        this.draw();

        requestAnimationFrame((t) => this.loop(t));
    }
}

// Init game when DOM is loaded
window.addEventListener('load', () => {
    // Wait slightly to ensure Three.js is parsed if loaded async
    setTimeout(() => {
        new Game();
    }, 100);
});
