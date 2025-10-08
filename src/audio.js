
/**
 * The Web Audio Context.
 *
 * @const {!AudioContext}
 */
const audioContext = new AudioContext();

/**
 * Audio sample rate.
 * Doubles as the gunfire "frame count", because the effect is 1 second long.
 * @const {number}
 */
const sampleRate = audioContext.sampleRate;

/**
 * White noise audio buffer.
 * The base of the gunfire sound is plain old white noise.
 * @const {!AudioBuffer}
 */
const whiteNoiseBuffer = audioContext.createBuffer(1, sampleRate, sampleRate);

/**
 * White noise audio data.
 * Filled with random numbers in the range of -1..1.
 * @const {!Float32Array}
 */
const whiteNoiseData = whiteNoiseBuffer.getChannelData(0);
for (let i = 0; i < sampleRate; i++) {
    whiteNoiseData[i] = Math.random() * 2 - 1;
}

/**
 * Plays a gunfire sound.
 *
 * Largely based on this BBC article:
 * https://webaudio.prototyping.bbc.co.uk/gunfire/
 *
 * @param {number} distance
 * @param {number=} opt_length Optional length, default is 1 second.
 */
function playGunfire(distance, opt_length) {
    if (distance > 500) {
        return;
    }

    let length = opt_length || 1;

    // Volume by distance
    // https://gamedev.stackexchange.com/a/11619
    let inverseDistance = 1.0 - distance / 500.0;
    let volumePercent = inverseDistance * inverseDistance;
    let lowpassFrequency = 1000 - distance;
    let bassBoostFrequency = 5000 - 10 * distance;
    let bassBoostGain = Math.max(1, 10 - distance / 50);

    let now = audioContext.currentTime;
    let envelope = audioContext.createGain();
    envelope.gain.value = 0;
    envelope.gain.setValueAtTime(10 * volumePercent, now);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + 0.7 * length);
    envelope.gain.setValueAtTime(0, now + length);
    envelope.connect(audioContext.destination);

    let filter = audioContext.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 1;
    filter.frequency.value = lowpassFrequency;
    filter.connect(envelope);

    // Boost bass
    // https://stackoverflow.com/a/29111314/2051724
    let bassFilter = audioContext.createBiquadFilter();
    bassFilter.type = "lowshelf";
    bassFilter.frequency.value = bassBoostFrequency;
    bassFilter.gain.value = bassBoostGain;
    bassFilter.connect(filter);

    let node = audioContext.createBufferSource();
    node.buffer = whiteNoiseBuffer;
    node.connect(bassFilter);
    node.start();
}

function playPickupSound() {
    playGunfire(0, 0.2);
}

/*
 * Music - MP3 File Support
 */

/**
 * Master music volume control.
 * @const {!GainNode}
 */
const musicGain = audioContext.createGain();
musicGain.connect(audioContext.destination);
musicGain.gain.setTargetAtTime(0.04, 0, 0.01);

/**
 * Currently playing music source.
 * @type {?AudioBufferSourceNode}
 */
let currentMusicSource = null;

/**
 * Music buffer cache.
 * @type {?AudioBuffer}
 */
let musicBuffer = null;

/**
 * Loads an MP3 file and converts it to an AudioBuffer.
 * @param {string} url The URL of the MP3 file.
 * @return {!Promise<!AudioBuffer>}
 */
function loadMusicFile(url) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        
        xhr.onload = function() {
            if (xhr.status === 200) {
                audioContext.decodeAudioData(/** @type {!ArrayBuffer} */ (xhr.response), 
                    function(buffer) {
                        resolve(buffer);
                    },
                    function(error) {
                        reject(error);
                    }
                );
            } else {
                reject(new Error('Failed to load music file: ' + xhr.status));
            }
        };
        
        xhr.onerror = function() {
            reject(new Error('Failed to load music file'));
        };
        
        xhr.send();
    });
}

/**
 * Preloads the music file.
 * @param {string} musicPath Path to the MP3 file (e.g., 'music.mp3')
 */
function preloadMusic(musicPath) {
    loadMusicFile(musicPath)
        .then(function(buffer) {
            musicBuffer = buffer;
            console.log('Music loaded successfully');
        })
        .catch(function(error) {
            console.error('Failed to load music:', error);
        });
}

/**
 * Plays the loaded music file with looping.
 */
function playMusic() {
    if (!musicBuffer) {
        console.warn('No music buffer loaded');
        return;
    }
    
    // Check if audio context is suspended (needs user interaction)
    if (audioContext.state === 'suspended') {
        console.log('Audio context suspended, attempting to resume...');
        audioContext.resume().then(() => {
            console.log('Audio context resumed successfully');
            playMusicInternal();
        }).catch(error => {
            console.error('Failed to resume audio context:', error);
        });
        return;
    }
    
    playMusicInternal();
}

/**
 * Internal function to actually play the music.
 */
function playMusicInternal() {
    // Stop any currently playing music
    stopMusic();
    
    // Create new source and play
    currentMusicSource = audioContext.createBufferSource();
    currentMusicSource.buffer = musicBuffer;
    currentMusicSource.loop = true;
    currentMusicSource.connect(musicGain);
    currentMusicSource.start();
    console.log('Music started playing');
}

/**
 * Stops the currently playing music.
 */
function stopMusic() {
    if (currentMusicSource) {
        currentMusicSource.stop();
        currentMusicSource = null;
    }
}

/**
 * Turns music on or off.
 * @param {boolean} enabled
 */
function setMusicEnabled(enabled) {
    if (enabled) {
        playMusic();
    } else {
        stopMusic();
    }
}

// Preload the music file when the audio system initializes
// Using the existing battle theme music file
preloadMusic('/battleThemeA.mp3');
