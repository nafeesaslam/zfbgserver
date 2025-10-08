/**
 * Mobile Bridge - Handles communication between Ionic wrapper and game
 * Add this script to your index.html AFTER client.js
 */

(function() {
  console.log('Mobile bridge initializing...');

  let isMobile = false;
  let joystickAngle = 0;
  let joystickForce = 0;
  let joystickActive = false;

  // Listen for messages from Ionic wrapper
  window.addEventListener('message', function(event) {
    const message = event.data;

    switch(message.type) {
      case 'ENABLE_POINTER_LOCK':
        isMobile = message.mobile;
        console.log('Mobile bridge initialized, mobile mode:', isMobile);
        
        // Note: Pointer lock will be requested on user click (in client.js)
        // We don't auto-request here to avoid "user gesture required" errors
        break;

      case 'JOYSTICK_MOVE':
        joystickActive = true;
        joystickAngle = message.angle;
        joystickForce = message.force;
        handleJoystickMovement();
        break;

      case 'JOYSTICK_END':
        joystickActive = false;
        joystickForce = 0;
        break;

      case 'CAMERA_MOVE':
        handleCameraMove(message.deltaX, message.deltaY);
        break;

      case 'SHOOT':
        handleShoot();
        break;

      case 'JUMP':
        handleJump();
        break;
    }
  });

  /**
   * Handle joystick movement
   */
  function handleJoystickMovement() {
    if (!joystickActive || !window.player) return;

    // Convert joystick to WASD-like movement
    const moveX = Math.cos(joystickAngle) * joystickForce;
    const moveY = Math.sin(joystickAngle) * joystickForce;

    // Simulate key presses based on joystick direction
    if (window.keys) {
      // Key codes (from keys.js)
      const KEY_W = 87;
      const KEY_S = 83;
      const KEY_A = 65;
      const KEY_D = 68;

      // Clear all movement keys first
      window.keys[KEY_W].down = false;
      window.keys[KEY_S].down = false;
      window.keys[KEY_A].down = false;
      window.keys[KEY_D].down = false;

      // Set keys based on joystick direction
      if (moveY < -0.3) window.keys[KEY_W].down = true;  // Forward
      if (moveY > 0.3) window.keys[KEY_S].down = true;   // Backward
      if (moveX < -0.3) window.keys[KEY_A].down = true;  // Left
      if (moveX > 0.3) window.keys[KEY_D].down = true;   // Right
    }
  }

  /**
   * Handle camera movement from touch
   */
  function handleCameraMove(deltaX, deltaY) {
    if (!window.player) return;

    const sensitivity = 0.002;
    
    // Update player yaw and pitch
    player.yaw += sensitivity * deltaX;
    player.pitch += sensitivity * deltaY;

    // Clamp pitch to prevent over-rotation
    const maxPitch = Math.PI / 2 - 0.1;
    player.pitch = Math.max(-maxPitch, Math.min(maxPitch, player.pitch));

    console.log('Camera moved - Yaw:', player.yaw, 'Pitch:', player.pitch);
  }

  /**
   * Handle shoot action
   */
  function handleShoot() {
    if (window.shoot && typeof window.shoot === 'function') {
      window.shoot();
      console.log('Shoot triggered');
    }
  }

  /**
   * Handle jump action
   */
  function handleJump() {
    const KEY_SPACE = 32;
    if (window.keys && window.keys[KEY_SPACE]) {
      window.keys[KEY_SPACE].downCount = 1;
      console.log('Jump triggered');
    }
  }

  // Expose mobile status
  window.isMobileWrapped = function() {
    return isMobile;
  };

  console.log('Mobile bridge ready');
})();
