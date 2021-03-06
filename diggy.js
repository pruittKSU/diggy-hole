(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = (function() { 
  
  function Animation(image, width, height, top, left, numberOfFrames, secondsPerFrame) {
    this.frameIndex = 0,
    this.time = 0,
    this.secondsPerFrame = secondsPerFrame || (1/16),
    this.numberOfFrames = numberOfFrames || 1;
  
    this.width = width;
    this.height = height;
    this.image = image;
    
    this.drawLocationX = top || 0;
    this.drawLocationY = left || 0;
  }
  
  Animation.prototype.setStats = function(frameCount, locationX, locationY){
    this.numberOfFrames = frameCount;
    this.drawLocationY = locationY; 
    this.drawLocationX = locationX;
  } 
		
	Animation.prototype.update = function (elapsedTime, tilemap) {
    this.time += elapsedTime;
    
    // Update animation
    if (this.time > this.secondsPerFrame) {
      if(this.time > this.secondsPerFrame) this.time -= this.secondsPerFrame;
      
      // If the current frame index is in range
      if (this.frameIndex < this.numberOfFrames - 1) {	
        this.frameIndex += 1;
      } else {
        this.frameIndex = 0;
      }
    }
  }
		
	Animation.prototype.render = function(ctx, x, y) {
		
    // Draw the current frame
    ctx.drawImage(
      this.image,
      this.drawLocationX + this.frameIndex * this.width,
      this.drawLocationY,
      this.width,
      this.height,
      x,
      y,
      this.width,
      this.height);
  }
  
  return Animation;
  
}());

},{}],2:[function(require,module,exports){
/* Class of the Barrel Skeleton entity
 *
 * Author:
 * - Matej Petrlik 
 */
 
 
module.exports = (function(){
  var Entity = require('./entity.js'),
		Player = require('./player.js'),
		Bone = require('./bone.js'),
      Animation = require('./animation.js');
	  entityManager = require('./entity-manager.js');
  
  
  const DEBUG = true;
  
  
  /* The following are barrel states */
  const IDLE = 0;
  const ATTACKING = 1;
  const ROLLING = 2;
  const FALLING = 3;
  const SWIMMING = 4;
  const DEAD = 5;

  const PROJECTILE = 6;
  
  
  // The Sprite Size
  const SIZE = 64;

  // Movement constants
  const SPEED = 150;
  const GRAVITY = -250;
  const JUMP_VELOCITY = -600;
  const MAX_BUMPS = 3;
  
  
    var boneLeft = new Image();
  boneLeft.src = 'img/BoneLeft.png';
  
  var barrelIdle = new Image();
  barrelIdle.src = 'img/BarrelIdle.png';
  
    var barrelAttack = new Image();
  barrelAttack.src = 'img/BarrelAttack.png';
  
      var barrelRollingLeft = new Image();
  barrelRollingLeft.src = 'img/BarrelRollingLeft.png';
  
      var barrelRollingRight = new Image();
  barrelRollingRight.src = 'img/BarrelRollingRight.png';
  
    var barrelDead = new Image();
  barrelDead.src = 'img/BarrelBroken.png';

  //The Barrel constructor
  function Barrel(locationX, locationY, layerIndex) {
    this.layerIndex = layerIndex;
    this.currentX = locationX; 
    this.currentY = locationY; 
    this.nextX = 0; 
    this.nextY = 0;
    this.currentTileIndex = 0; 
    this.nextTileIndex = 0;
    this.constSpeed = 15; 
    this.gravity = .5; 
    this.angle = 0; 
    this.xSpeed = 10; 
    this.ySpeed = 15;
    this.isLeft = false;
	
	this.type = "Barrel";
	
	this.range = 5*SIZE;
	this.attackFrequency = 1.7;
	this.lastAttack = 0;
	this.lives = 5;
	
	this.state = IDLE;
	this.playerInRange = false;
	this.attacked = false;
	this.recovered = true;
	this.attackedFromLeft = false;
	this.bumpCount = 0;
    
    //The animations
    this.animations = {
      left: [],
      right: [],
    }
    
    //The right-facing animations
    this.animations.right[IDLE] = new Animation(barrelIdle, SIZE, SIZE, 0, 0, 15);
	this.animations.right[ATTACKING] = new Animation(barrelAttack, SIZE, SIZE, 0, 0, 12);
    this.animations.right[ROLLING] = new Animation(barrelRollingRight, SIZE, SIZE, 0, 0, 8);
    this.animations.right[FALLING] = new Animation(barrelIdle, SIZE, SIZE, 0, 0, 15);
    this.animations.right[SWIMMING] = new Animation(barrelRollingRight, SIZE, SIZE, 0, 0, 8);
	this.animations.right[DEAD] = new Animation(barrelDead, SIZE, SIZE, 0, 0, 1);
    
    //The left-facing animations
    this.animations.left[IDLE] = new Animation(barrelIdle, SIZE, SIZE, 0, 0, 15);
	this.animations.left[ATTACKING] = new Animation(barrelAttack, SIZE, SIZE, 0, 0, 12);
    this.animations.left[ROLLING] = new Animation(barrelRollingLeft, SIZE, SIZE, 0, 0, 8);
    this.animations.left[FALLING] = new Animation(barrelIdle, SIZE, SIZE, 0, 0, 15);
    this.animations.left[SWIMMING] = new Animation(barrelRollingLeft, SIZE, SIZE, 0, 0, 8);
	this.animations.left[DEAD] = new Animation(barrelDead, SIZE, SIZE, 0, 0, 1);
  }
  
  // Barrel inherits from Entity
  Barrel.prototype = new Entity();
  
  // Determines if the barrel is on the ground
  Barrel.prototype.onGround = function(tilemap) {
    var box = this.boundingBox(),
        tileX = Math.floor((box.left + (SIZE/2))/64),
        tileY = Math.floor(box.bottom / 64),
        tile = tilemap.tileAt(tileX, tileY, this.layerIndex);   
    // find the tile we are standing on.
    return (tile && tile.data.solid) ? true : false;
  }
  
  // Moves the barrel to the left, colliding with solid tiles
  Barrel.prototype.moveLeft = function(distance, tilemap) {
    this.currentX -= distance;
    var box = this.boundingBox(),
        tileX = Math.floor(box.left/64),
        tileY = Math.floor(box.bottom / 64) - 1,
        tile = tilemap.tileAt(tileX, tileY, this.layerIndex);
    if (tile && tile.data.solid) {
		this.attackedFromLeft = true;
		if(++this.bumpCount>MAX_BUMPS){
			this.state = IDLE;
			this.bumpCount = 0;
		}
      this.currentX = (Math.floor(this.currentX/64) + 1) * 64;
	}
  }
  
  // Moves the barrel to the right, colliding with solid tiles
  Barrel.prototype.moveRight = function(distance, tilemap) {
    this.currentX += distance;
    var box = this.boundingBox(),
        tileX = Math.floor(box.right/64),
        tileY = Math.floor(box.bottom / 64) - 1,
        tile = tilemap.tileAt(tileX, tileY, this.layerIndex);
    if (tile && tile.data.solid){
		this.attackedFromLeft = false;
		if(++this.bumpCount>MAX_BUMPS){
			this.state = IDLE;
			this.bumpCount = 0;
		}		
      this.currentX = (Math.ceil(this.currentX/64)-1) * 64;
	}
  }
  
  /* Barrel update function
   * arguments:
   * - elapsedTime, the time that has passed 
   *   between this and the last frame.
   * - tilemap, the tilemap that corresponds to
   *   the current game world.
   */
  Barrel.prototype.update = function(elapsedTime, tilemap, entityManager) {
	  if(this.state == DEAD){
		 return;
	  }
    var sprite = this;
    
	var entities = entityManager.queryRadius(this.currentX, this.currentY, this.range);
	this.playerInRange = false;
		for(var i=0; i<entities.length;i++){
			if(entities[i] instanceof Player){
				this.playerInRange = true;
				if(!this.recovered && Math.pow(entities[i].currentX-this.currentX,2)+Math.pow(entities[i].currentY-this.currentY,2)>Math.pow(SIZE,2)){
					this.recovered = true;
				}
				break;
			}
		}
    
      // Process barrel state
      switch(sprite.state) {
		  
        case IDLE:
			if(!sprite.onGround(tilemap)) {
            sprite.state = FALLING;
            sprite.velocityY = 0;
			if(DEBUG){
				console.log("Barrel state: FALLING");
			}
          } else if(sprite.attacked){
	  
			if(!sprite.attackedFromLeft) {
              sprite.isLeft = true;
              sprite.state = ROLLING;
              sprite.moveLeft(elapsedTime * SPEED, tilemap);
			  if(DEBUG){
				console.log("Barrel direction: left");
			}
            }
            else if(sprite.attackedFromLeft) {
              sprite.isLeft = false;
              sprite.state = ROLLING;
              sprite.moveRight(elapsedTime * SPEED, tilemap);
			  
			  if(DEBUG){
				console.log("Barrel direction: right");
			}
            }
		  }
			else if(sprite.playerInRange){
				this.lastAttack = this.attackFrequency;
				sprite.state = ATTACKING;
				
				if(DEBUG){
				console.log("Barrel state: ATTACKING");
			}
			}
			break;
          
		
		
		case ATTACKING:
			sprite.attack(elapsedTime, entities);
			if(!sprite.onGround(tilemap)) {
            sprite.state = FALLING;
            sprite.velocityY = 0;
			if(DEBUG){
				console.log("Barrel state: FALLING");
			}
          } else if(sprite.attacked){
			if(!sprite.attackedFromLeft) {
              sprite.isLeft = true;
              sprite.state = ROLLING;
              sprite.moveLeft(elapsedTime * SPEED, tilemap);
            }
            else if(sprite.attackedFromLeft) {
              sprite.isLeft = false;
              sprite.state = ROLLING;
              sprite.moveRight(elapsedTime * SPEED, tilemap);
            }
		  }
			else if(!sprite.playerInRange){
				sprite.state = IDLE;
				
				if(DEBUG){
				console.log("Barrel state: IDLE");
			}
			}
          
		break;
		
        case ROLLING:
          // If there is no ground underneath, fall
          if(!sprite.onGround(tilemap)) {
            sprite.state = FALLING;
            sprite.velocityY = 0;
			if(DEBUG){
				console.log("Barrel state: FALLING");
			}
          } else {
			if(sprite.playerInRange && !sprite.attackedFromLeft) {
              sprite.isLeft = true;
              sprite.state = ROLLING;
              sprite.moveLeft(elapsedTime * SPEED, tilemap);
			  this.attacked = false;
            }
            else if(sprite.playerInRange && sprite.attackedFromLeft) {
              sprite.isLeft = false;
              sprite.state = ROLLING;
              sprite.moveRight(elapsedTime * SPEED, tilemap);
			  this.attacked = false;
            }
            else {
				sprite.attacked = false;
				sprite.recovered = true;
              sprite.state = IDLE;
			  
			  if(DEBUG){
				console.log("Barrel state: ROLLING");
			}
            }
          }
          break;
		  
        case FALLING:
          sprite.velocityY += Math.pow(GRAVITY * elapsedTime, 2);
          sprite.currentY += sprite.velocityY * elapsedTime;
		  if(sprite.onGround(tilemap)) {
			  sprite.currentY = 64 * Math.floor(sprite.currentY / 64);
		  if(sprite.playerInRange && !sprite.attackedFromLeft) {
              sprite.isLeft = true;
              sprite.state = ROLLING;
              sprite.moveLeft(elapsedTime * SPEED, tilemap);
            }
            else if(sprite.playerInRange && sprite.attackedFromLeft) {
              sprite.isLeft = false;
              sprite.state = ROLLING;
              sprite.moveRight(elapsedTime * SPEED, tilemap);
            } else {
            sprite.state = IDLE;
            
			
			if(DEBUG){
				console.log("Barrel state: IDLE");
			}
          }
		}
          break;
		  
		case DEAD:
			
		break;
		  
        case SWIMMING:
          // NOT IMPLEMENTED YET
      }
	
	  
	    // Update animation
    if(this.isLeft)
      this.animations.left[this.state].update(elapsedTime);
    else
      this.animations.right[this.state].update(elapsedTime);
	
	} 
  
  
  /* Barrel Render Function
   * arguments:
   * - ctx, the rendering context
   * - debug, a flag that indicates turning on
   * visual debugging
   */
  Barrel.prototype.render = function(ctx, debug) {
    // Draw the barrel (and the correct animation)
    if(this.isLeft)
      this.animations.left[this.state].render(ctx, this.currentX, this.currentY);
    else
      this.animations.right[this.state].render(ctx, this.currentX, this.currentY);
    
    if(debug) renderDebug(this, ctx);
  }
  
  // Draw debugging visual elements
  function renderDebug(barrel, ctx) {
    var bounds = barrel.boundingBox();
    ctx.save();
    
    // Draw barrel bounding box
    ctx.strokeStyle = "red";
    ctx.beginPath();
    ctx.moveTo(bounds.left, bounds.top);
    ctx.lineTo(bounds.right, bounds.top);
    ctx.lineTo(bounds.right, bounds.bottom);
    ctx.lineTo(bounds.left, bounds.bottom);
    ctx.closePath();
    ctx.stroke();
    
    // Outline tile underfoot
    var tileX = 64 * Math.floor((bounds.left + (SIZE/2))/64),
        tileY = 64 * (Math.floor(bounds.bottom / 64));
    ctx.strokeStyle = "black";
    ctx.beginPath();
    ctx.moveTo(tileX, tileY);
    ctx.lineTo(tileX + 64, tileY);
    ctx.lineTo(tileX + 64, tileY + 64);
    ctx.lineTo(tileX, tileY + 64);
    ctx.closePath();
    ctx.stroke();
    
    ctx.restore();
  }
  
  /* barrel BoundingBox Function
   * returns: A bounding box representing the barrel 
   */
  Barrel.prototype.boundingBox = function() {
    return {
      left: this.currentX,
      top: this.currentY,
      right: this.currentX + SIZE,
      bottom: this.currentY + SIZE
    }
  }
  
  
    Barrel.prototype.boundingCircle = function() {
     return {
		 cx: this.currentX + SIZE/2,
		 cy: this.currentY + SIZE/2,
		 radius: SIZE/2
	 }
   }
   
      /* Collide function
    * This function is called by the entityManager when it determines
    * a possible collision.
    * parameters:
    * - otherEntity is the entity this enemy collided with
    *   You will likely want to use 
    *     'otherEntity instanceof <Type>' 
    *   to determine what type it is to know what to 
    *   do with it.
    */
   Barrel.prototype.collide = function(otherEntity) {
	   if((this.state == ATTACKING || this.state == IDLE) && this.recovered && otherEntity instanceof Player){
		   if(DEBUG){
		   console.log("Collision with player");
	   }
		   if(--this.lives<=0){
			   this.state = DEAD;
			   if(DEBUG){
				console.log("Barrel state: DEAD");
			}
			   
		   } else {
			   if(DEBUG){
		   console.log(this.lives+" lives left");
		   console.log("Barrel state: ROLLING");
	   }
			   this.attacked = true;
			   this.recovered = false;
			   this.state = ROLLING;
			   if(otherEntity.currentX <= this.currentX){
				   this.attackedFromLeft = true;
			   } else {
				   this.attackedFromLeft = false;
			   }
		   }
	   }
   }
   
   
   Barrel.prototype.attack = function(elapsedTime, entities){
		this.lastAttack += elapsedTime;
		if(this.lastAttack >= this.attackFrequency){
			
			for(var i=0; i<entities.length;i++){
				if(entities[i] instanceof Player){
					var playerX = entities[i].currentX;
					break;
				}
			}
			if(playerX > this.currentX){
				var isLeft = false;
			} else {
				var isLeft = true;
			}
			
			this.lastAttack = 0;
			bone = new Bone(this.currentX, this.currentY, 0, isLeft);
			entityManager.add(bone);
		}
	   
   }
  
  return Barrel;

}());


},{"./animation.js":1,"./bone.js":3,"./entity-manager.js":5,"./entity.js":6,"./player.js":12}],3:[function(require,module,exports){
/* Class of the Barrel Skeleton entity
 *
 * Author:
 * - Matej Petrlik 
 */
 
 
module.exports = (function(){
  var Entity = require('./entity.js'),
		Player = require('./player.js'),
      Animation = require('./animation.js');
  
  
  const DEBUG = true;
  
  const PROJECTILE = 0;
  
  // The Sprite Size
  const SIZE = 64;

  // Movement constants
  
    var boneLeft = new Image();
  boneLeft.src = 'img/BoneLeft.png';
  

  //The Bone constructor
  function Bone(locationX, locationY, layerIndex, isLeft) {
    this.layerIndex = layerIndex;
    this.currentX = locationX; 
    this.currentY = locationY; 
    this.xSpeed = 200; 
    this.isLeft = isLeft;
	
	this.type = "Bone";
	
	this.range = 5*SIZE;
	this.enabled = true;
	this.distTraveled = 0;
	this.size = SIZE/2;
	this.playerHit = false;
	
    
    //The animations
    this.animations = {
      left: [],
      right: [],
    }
    
    //The right-facing animations
	this.animations.right[PROJECTILE] = new Animation(boneLeft, SIZE, SIZE, 0, 0, 8);
    
    //The left-facing animations
	this.animations.left[PROJECTILE] = new Animation(boneLeft, SIZE, SIZE, 0, 0, 8);
  }
  
  // Bone inherits from Entity
	Bone.prototype = new Entity();
  
	Bone.prototype.onGround = function(tilemap) {
    var box = this.boundingBox(),
        tileX = Math.floor((box.left + (SIZE/2))/64),
        tileY = Math.floor(box.bottom / 64),
        tile = tilemap.tileAt(tileX, tileY, this.layerIndex);   
    return (tile && tile.data.solid) ? true : false;
  }
  
  

  Bone.prototype.update = function(elapsedTime, tilemap, entityManager) {
    
	var entities = entityManager.queryRadius(this.currentX, this.currentY, this.range);
	  
	// Update projectile
	if(this.enabled){
			if(this.isLeft){
				this.currentX -= elapsedTime * this.xSpeed;
			} else {
				this.currentX += elapsedTime * this.xSpeed;
			}
			this.distTraveled += elapsedTime * this.xSpeed;	
			
			
			if(this.distTraveled >= this.range){
				this.distTraveled = 0;
				this.enabled = false;
			}
			
			if(this.isLeft){
		var box = this.boundingBox(),
        tileX = Math.floor(box.left/64),
        tileY = Math.floor(box.bottom / 64) - 1,
        tile = tilemap.tileAt(tileX, tileY, this.layerIndex);
    if (tile && tile.data.solid) 
      this.enabled = false;

			
		
	} else {
		var box = this.boundingBox(),
        tileX = Math.floor(box.right/64),
        tileY = Math.floor(box.bottom / 64) - 1,
        tile = tilemap.tileAt(tileX, tileY, this.layerIndex);
    if (tile && tile.data.solid)
      this.enabled = false;
	}  
       
	} 
	
	// Update projectile animation
	if(this.isLeft){
		this.animations.left[PROJECTILE].update(elapsedTime);
	} else {
		this.animations.right[PROJECTILE].update(elapsedTime);
	}
	
	if(!this.enabled){
		entityManager.remove(this);
	}
  }
  
  Bone.prototype.render = function(ctx, debug) {
	if(this.enabled){
		if(this.isLeft){
			this.animations.left[PROJECTILE].render(ctx, this.currentX, this.currentY);
		} else {
			this.animations.right[PROJECTILE].render(ctx, this.currentX, this.currentY);
		}
	}
	
	   if(debug) renderDebug(this, ctx);
  }
  
  // Draw debugging visual elements
  function renderDebug(bone, ctx) {
    var bounds = bone.boundingBox();
    ctx.save();
    
    // Draw bone bounding box
    ctx.strokeStyle = "red";
    ctx.beginPath();
    ctx.moveTo(bounds.left, bounds.top);
    ctx.lineTo(bounds.right, bounds.top);
    ctx.lineTo(bounds.right, bounds.bottom);
    ctx.lineTo(bounds.left, bounds.bottom);
    ctx.closePath();
    ctx.stroke();
    
    // Outline tile underfoot
    var tileX = 64 * Math.floor((bounds.left + (SIZE/2))/64),
        tileY = 64 * (Math.floor(bounds.bottom / 64));
    ctx.strokeStyle = "black";
    ctx.beginPath();
    ctx.moveTo(tileX, tileY);
    ctx.lineTo(tileX + 64, tileY);
    ctx.lineTo(tileX + 64, tileY + 64);
    ctx.lineTo(tileX, tileY + 64);
    ctx.closePath();
    ctx.stroke();
    
    ctx.restore();
  }
  
  
  Bone.prototype.boundingBox = function() {
    return {
      left: this.currentX,
      top: this.currentY,
      right: this.currentX + this.size*2,
      bottom: this.currentY + this.size*2
    }
  }
  
  
    Bone.prototype.boundingCircle = function() {
     return {
		 cx: this.currentX + this.size/2,
		 cy: this.currentY + this.size/2,
		 radius: this.size/2
	 }
   }
   
      /* Collide function
    * This function is called by the entityManager when it determines
    * a possible collision.
    * parameters:
    * - otherEntity is the entity this enemy collided with
    *   You will likely want to use 
    *     'otherEntity instanceof <Type>' 
    *   to determine what type it is to know what to 
    *   do with it.
    */
   Bone.prototype.collide = function(otherEntity) {
	   if( otherEntity instanceof Player){
		   this.enabled = false;
		   if(DEBUG){
		   console.log("Player hit by bone");	 			   
		   } 
	   }
   }
   
   
  
  return Bone;

}());


},{"./animation.js":1,"./entity.js":6,"./player.js":12}],4:[function(require,module,exports){
// Credits Menu game state defined using the Module pattern
module.exports = (function (){
  var menu = document.getElementById("credits-menu"),
      exit = document.getElementById("exit-btn"),
      wrap = document.getElementById("credits-wrapper"),
      scroll = 0,
      stateManager;    
   
  /*
   * The load() method initializes the menu 
   * and tells the DOM to render the menu HTML
   * parameters:
   * - sm the state manager
   */
  var load = function(sm) {
    stateManager = sm;
    menu.style.display = "flex";
    scroll = 200;
    wrap.style.marginTop = "200px";
  }
  
  /*
   * The exit() method hides the menu
   */
  var exit = function() {
    menu.style.display = "none";
  }
    
  /* 
   * The update() method updates the menu,
   * scrolling the credits
   */
  var update = function(elapsedTime) {
    scroll -= 0.0001 * elapsedTime;
    wrap.style.marginTop = Math.round(scroll) + "px";   
  }
  
  /* 
   * The render() method renders the menu
   * (in this case, a no-op as the menu is 
   * HTML elements renderd by the DOM)
   */
  var render = function() {}
    
  /* 
   * The keyHander() method handles key
   * events for the menu.
   */
  var keyDown = function(event) {
    switch(event.keyCode) {
      case 13: // ENTER
      case 32: // SPACE
      case 27: // ESC
        event.preventDefault();
        stateManager.popState();
        break;
    }
  }
  
  var keyUp = function(event) {}
  
  return {
    load: load,
    exit: exit,
    update: update,
    render: render,
    keyDown: keyDown,
    keyUp: keyUp
  }
  
})();
},{}],5:[function(require,module,exports){
/* The entity manager for the DiggyHole game
 * Currently it uses brute-force approaches
 * to its role - this needs to be refactored
 * into a spatial data structure approach.
 * Authors:
 * - Nathan Bean 
 */
module.exports = (function (){
  const MAX_ENTITIES = 100;
  
  var entities = [],
      entityCount = 0;
  
  /* Adds an entity to those managed.
   * Arguments:
   * - entity, the entity to add
   */
  function add(entity) {
    if(entityCount < MAX_ENTITIES) {
      // Determine the entity's unique ID
      // (we simply use an auto-increment count)
      var id = entityCount;
      entityCount++;
      
      // Set the entity's id on the entity itself
      // as a property.  Due to the dynamic nature of 
      // JavaScript, this is easy
      entity._entity_id = id;
      
      // Store the entity in the entities array
      entities[id] = entity;
      return true;
    } else { 
      // We've hit the max number of allowable entities,
      // yet we may have freed up some space within our
      // entity array when an entity was removed.
      // If so, let's co-opt it.
      for(var i = 0; i < MAX_ENTITIES; i++) {
        if(entities[i] == undefined) {
          entity._entity_id = i;
          entities[i] = entity;
          return i;
        }
      }
      // If we get to this point, there are simply no
      // available spaces for a new entity.
      // Log an error message, and return an error value.
      console.error("Too many entities");
      return undefined;
    }
  }
  
  /* Removes an entity from those managed
   * Arguments: 
   * - entity, the entity to remove
   */
  function remove(entity) {
    // Set the entry in the entities table to undefined,
    // indicating an open slot
    entities[entity._entity_id] = undefined;
  }
  
  /* Checks for collisions between entities, and
   * triggers the collide() event handler.
   */
  function checkCollisions() {
    for(var i = 0; i < entityCount; i++) {
      // Don't check for nonexistant entities
      if(entities[i]) {
        for(var j = 0; j < entityCount; j++) {
          // don't check for collisions with ourselves
          // and don't bother checking non-existing entities
          if(i != j && entities[j]) {
            var boundsA = entities[i].boundingBox();
            var boundsB = entities[j].boundingBox();
            if( boundsA.left < boundsB.right &&
                boundsA.right > boundsB.left &&
                boundsA.top < boundsB.bottom &&
                boundsA.bottom > boundsB.top
              ) {
              entities[i].collide(entities[j]);
              entities[j].collide(entities[i]);
            }
          }
        }
      }
    }
  }
  
  /* Returns all entities within the given radius.
   * Arguments: 
   * - x, the x-coordinate of the center of the query circle
   * - y, the y-coordinate of the center of the query circle
   * - r, the radius of the center of the circle
   * Returns:
   *   An array of entity references
   */
  function queryRadius(x, y, r) {
    var entitiesInRadius = [];
    for(var i = 0; i < entityCount; i++) {
      // Only check existing entities
      if(entities[i]) {
        var circ = entities[i].boundingCircle();
        if( Math.pow(circ.radius + r, 2) >=
            Math.pow(x - circ.cx, 2) + Math.pow(y - circ.cy, 2)
        ){
		entitiesInRadius.push(entities[i]);
      }
    }
	}
    return entitiesInRadius;
  }
  
  /* Updates all managed entities
   * Arguments:
   * - elapsedTime, how much time has passed between the prior frameElement
   *   and this one.
   * - tilemap, the current tilemap for the game.
   */
  function update(elapsedTime, tilemap) {
    for(i = 0; i < entityCount; i++) {
      if(entities[i]) entities[i].update(elapsedTime, tilemap, this);
    }
    checkCollisions();
  }
  
  /* Renders the managed entities
   * Arguments:
   * - ctx, the rendering contextual
   * - debug, the flag to trigger visual debugging
   */
  function render(ctx, debug) {
    for(var i = 0; i < entityCount; i++) {
      if(entities[i]) entities[i].render(ctx, debug);
    }
  }
  
  return {
    add: add,
    remove: remove,
    queryRadius: queryRadius,
    update: update,
    render: render
  }
  
}());
},{}],6:[function(require,module,exports){
/* Base class for all game entities,
 * implemented as a common JS module
 * Authors:
 * - Nathan Bean 
 */
module.exports = (function(){
  
  /* Constructor
   * Generally speaking, you'll want to set
   * the X and Y position, as well as the layerX
   * of the map the entity is located on
   */
  function Entity(locationX, locationY, mapLayer){
    this.x = locationX;
    this.y = locationY;
    this.mapLayer = mapLayer;
  }
  
  /* Update function
   * parameters:
   * - elapsedTime is the time that has passed since the
   *   previous frame 
   * - tilemap is the currently loaded tilemap; you'll 
   *   probably want to call its tileAt and setTile methods.
   * - entityManager is the game's entity manager, and
   *   keeps track of where all game entities are.
   *   you can call its query functions
   */
  Entity.prototype.update = function(elapsedTime, tilemap, entityManager) {
      // TODO: Determine what your entity will do
  }
  
  /* Render function
   * parameters:
   *  - context is the rendering context.  It may be transformed
   *    to account for the camera 
   */
   Entity.prototype.render = function(context) {
     // TODO: Draw your entity sprite
   }
   
   /* Collide function
    * This function is called by the entityManager when it determines
    * a possible collision.
    * parameters:
    * - otherEntity is the entity this enemy collided with
    *   You will likely want to use 
    *     'otherEntity instanceof <Type>' 
    *   to determine what type it is to know what to 
    *   do with it.
    */
   Entity.prototype.collide = function(otherEntity) {
   }
   
   /* BoundingBox function
    * This function returns an axis-aligned bounding
    * box, i.e {top: 0, left: 0, right: 20, bottom: 50}
    * the box should contain your entity or at least the
    * part that can be collided with.
    */
   Entity.prototype.boundingBox = function() {
     // Return a bounding box for your entity
   }
   
   /* BoundingCircle function
    * This function returns a bounding circle, i.e.
    * {cx: 0, cy: 0, radius: 20}
    * the circle should contain your entity or at 
    * least the part that can be collided with.
    */
   Entity.prototype.boundingCircle = function() {
     // Return a bounding circle for your entity
   }
   
   return Entity;
  
}());
},{}],7:[function(require,module,exports){
/* Game GameState module
 * Provides the main game logic for the Diggy Hole game.
 * Authors:
 * - Nathan Bean
 */
module.exports = (function (){
  
  // The width & height of the screen
  const SCREEN_WIDTH = 1280,
        SCREEN_HEIGHT = 720;	
	
  // Module variables
  var Player = require('./player.js'),
      inputManager = require('./input-manager.js'),
      tilemap = require('./tilemap.js'),
      entityManager = require('./entity-manager.js'),
      Barrel = require('./barrel.js'),
      player,
      screenCtx,
      backBuffer,
      backBufferCtx,
      stateManager;
  
  /* Loads the GameState, triggered by the StateManager
   * This function sets up the screen canvas, the tilemap,
   * and loads the entity.
   * arguments:
   * - sm, the state manager that loaded this game
   */  
  var load = function(sm) {
    stateManager = sm;
    
    // Set up the screen canvas
    var screen = document.createElement("canvas");
    screen.width = SCREEN_WIDTH;
    screen.height = SCREEN_HEIGHT;
    screenCtx = screen.getContext("2d");
    document.getElementById("game-screen-container").appendChild(screen);
  
    // Set up the back buffer
    backBuffer = document.createElement("canvas");
    backBuffer.width = SCREEN_WIDTH;
    backBuffer.height = SCREEN_HEIGHT;
    backBufferCtx = backBuffer.getContext("2d");
  
    // Generate the tilemap 
    tilemap.generate(1000, 1000, {
      viewport: {
        width: 1028,
        height: 720
      },
      onload: function() {
        window.tilemap = tilemap;
        tilemap.render(screenCtx);
      }
    });
    
    // Create the player and add them to
    // the entity manager
    player = new Player(180, 240, 0, inputManager);
    entityManager.add(player);
	
	for(var i = 0; i < 10; i++){
		barrel = new Barrel(Math.random()*64*1000, Math.random()*64*1000/8, 0, inputManager);
    entityManager.add(barrel);
	}
  }
   
  /* Updates the state of the game world
   * arguments: 
   * - elapsedTime, the amount of time passed between
   * this and the prior frame.   
   */
  var update = function(elapsedTime) {
    //player.update(elapsedTime, tilemap);
    entityManager.update(elapsedTime, tilemap);
    inputManager.swapBuffers();
  }
  
  /* Renders the current state of the game world
   */
  var render = function() {
    // Clear the back buffer
    backBufferCtx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    
    // TODO: Calculate rubberbanding
    var bounds = player.boundingBox();
    var offsetX = SCREEN_WIDTH / 2,
        offsetY = SCREEN_HEIGHT / 2;
    
    // Apply camera transforms
    backBufferCtx.save();backBufferCtx.translate(offsetX - bounds.left, offsetY - bounds.top);
    tilemap.setCameraPosition(bounds.left, bounds.top);
    
    // Redraw the map & entities
    tilemap.render(backBufferCtx);
    entityManager.render(backBufferCtx, true);
    //player.render(backBufferCtx, true);
    
    backBufferCtx.restore();
    
    // Flip the back buffer
    screenCtx.drawImage(backBuffer, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);    
  }
  
  /* Event handler for key down events
   * arguments:
   * - event, the key down event to process
   */
  function keyDown(event) {
    if(event.keyCode == 27) { // ESC
      var mainMenu = require('./main-menu.js');
      stateManager.pushState(mainMenu);
    } 
    inputManager.keyDown(event);
  }
  
  /* Event handler for key up events
   * arguments:
   * - event, the key up event to process
   */
  function keyUp(event) {
    inputManager.keyUp(event);
  }
  
  /* Exits the game */
  var exit = function() {}
  
  return {
    load: load,
    exit: exit,
    update: update,
    render: render,
    keyDown: keyDown,
    keyUp: keyUp
  }
  
})();
},{"./barrel.js":2,"./entity-manager.js":5,"./input-manager.js":8,"./main-menu.js":9,"./player.js":12,"./tilemap.js":13}],8:[function(require,module,exports){
module.exports = (function() { 

  var commands = {	
    RIGHT: 39,
    LEFT: 37,
	  UP: 38,
	  DOWN: 40,
    DIG: 32,
  }
  
  var oldKeys = [];
  var newKeys = [];
  for(var i = 30; i < 40; i++) {
    oldKeys[i] = false;
    newKeys[i] = false;
  }
  
  function swapBuffers() {
    for(var i = 30; i < 40; i++) {
      oldKeys[i] = newKeys[i];
    }
  }

  function keyDown(event) {
    event.preventDefault();
    newKeys[event.keyCode] = true;
    return false;
  }
  
  function keyUp(event) {
    event.preventDefault();
    newKeys[event.keyCode] = false;
    return false;
  }
  
  function isKeyDown(keyCode) {
    return newKeys[keyCode];
  }
  
  function wasKeyPressed(keyCode) {
    return (!oldKeys[keyCode] && newKeys[keyCode]);
  }
  
  function wasKeyReleased(keyCode) {
    return (oldKeys[keyCode] && !newKeys[keyCode]);
  }
  
  return {
    commands: commands,
    swapBuffers: swapBuffers,
    keyDown: keyDown,
    keyUp: keyUp,
    isKeyDown: isKeyDown,
    wasKeyPressed: wasKeyPressed,
    wasKeyReleased: wasKeyReleased
  }
  
})();
},{}],9:[function(require,module,exports){
/* MainMenu GameState module
 * Provides the main menu for the Diggy Hole game.
 * Authors:
 * - Nathan Bean
 */
module.exports = (function (){
  var menu = document.getElementById("main-menu"),
      play = document.getElementById("play-btn"),
      settings = document.getElementById("settings-btn"),
      credits = document.getElementById("credits-btn"),
      items = [play, settings, credits],
      selectedItemIndex = 0,
      stateManager;
  
  items.forEach( function(item, i) {
    item.onmouseover = function() {
      items[selectedItemIndex].classList.remove("selected");
      selectedItemIndex = i;
      items[selectedItemIndex].classList.add("selected");
    }
  });
  
  /*
   * The Play button exits the menu and returns 
   * to the previous (gameplay) state.  This 
   * should only be called when the stateManager
   * has been set via a load() call.
   */
  play.onclick = function(event) {
    event.preventDefault();
    stateManager.popState();
  }
  
  /* 
   * The Credits button launches the credit menu
   */
  credits.onclick = function(event) {
    event.preventDefault();
    var creditsScreen = require('./credits-screen');
    stateManager.pushState(creditsScreen);
  }
  
  /*
   * The load() method initializes the menu 
   * and tells the DOM to render the menu HTML
   * parameters:
   * - sm the state manager
   */
  var load = function(sm) {
    stateManager = sm;
    menu.style.display = "flex";
    items[selectedItemIndex].classList.add("selected");
  }
  
  /*
   * The exit() method hides the menu
   */
  var exit = function() {
    menu.style.display = "none";
  }
    
  /* 
   * The update() method updates the menu
   * (in this case, a no-op)
   */
  var update = function() {}
  
  /* 
   * The render() method renders the menu
   * (in this case, a no-op as the menu is 
   * HTML elements renderd by the DOM)
   */
  var render = function() {}
    
  /* 
   * The keyDown() method handles 
   * the key down event for the menu.
   */
  var keyDown = function(event) {
    switch(event.keyCode) {
      case 13: // ENTER
      case 32: // SPACE
        event.preventDefault();
        var me = new MouseEvent('click', {
          'view': window,
          'bubbles': true,
          'cancelable': true
        });
        items[selectedItemIndex].dispatchEvent(me);
        break;      
      case 27: // ESC
        event.preventDefault();
        stateManager.popState();
        break;
      case 40: // up
        event.preventDefault();
        items[selectedItemIndex].classList.remove("selected");
        selectedItemIndex++;
        if(selectedItemIndex >= items.length) selectedItemIndex = 0;
        items[selectedItemIndex].classList.add("selected");
        break;
      case 38: // down
        event.preventDefault();
        items[selectedItemIndex].classList.remove("selected");
        selectedItemIndex--;
        if(selectedItemIndex < 0) selectedItemIndex = items.length - 1;
        items[selectedItemIndex].classList.add("selected");
        break;
    }
  }
  
  /* The keyUp() method handles the key up event */
  function keyUp(event) {}
  
  return {
    load: load,
    exit: exit,
    update: update,
    render: render,
    keyDown: keyDown,
    keyUp: keyUp
  }
  
})();
},{"./credits-screen":4}],10:[function(require,module,exports){


// Wait for the window to load completely
window.onload = function() {
  
  var gameTime = 0,
      gameState = [];
    
  var pushState = function(state) {
    state.load({pushState: pushState, popState: popState});
    gameState.push(state);
  }
  
  var popState = function() {
    state = gameState.pop(); 
    if(state) state.exit();
    return state;
  }
  
  var game = require('./game');
  pushState(game);
  
  var mainMenu = require('./main-menu');
  pushState(mainMenu);
  
  // Event handlers for key events
  window.onkeydown = function(event) {
    gameState[gameState.length-1].keyDown(event);
  }
  window.onkeyup = function(event) {
    gameState[gameState.length-1].keyUp(event);
  }
  
  function loop(newTime) {
    var elapsedTime = (newTime - gameTime) / 1000;
    gameTime = newTime;
    gameState[gameState.length-1].update(elapsedTime);
    gameState[gameState.length-1].render(elapsedTime);
    window.requestAnimationFrame(loop);
  }
  window.requestAnimationFrame(loop);
  
};
},{"./game":7,"./main-menu":9}],11:[function(require,module,exports){
/* Noise generation module
 * Authors:
 * - Nathan Bean
 * - Wyatt Watson
 */
module.exports = (function(){
  // Initially, we start with a random seed
  var seed = Math.random();
  
  /* Seeds the random number generator
   * params:
   * - newSeed - the seed to use
   */
  function setSeed(newSeed) {
    seed = newSeed;
  }
  
  /* Taken from http://indiegamr.com/generate-repeatable-random-numbers-in-js/ */
  function randomNumber(min, max){
    min = min || 0;
    max = max || 1;
    
    seed = (seed * 9301 + 49297) % 233280;
    var random = seed/233280;
    
    return min + random * (max - min);
  }

  /* The following functions were done in tandem with the tutorial at 
  http://devmag.org.za/2009/04/25/perlin-noise/ and following along through
  Nathan Bean's Perlin Noise file*/

  function generateNoise(width, height){
    var noise = new Array(width*height);
    
    for (i = 0; i < width; i++){
      for (j = 0; j < height; j++){
        noise[j * width + i] = (randomNumber(0, 1269.5));
      }
    }
    
    return noise;
  }

  function generateSmoothNoise(mapWidth, noise, octave){
    var width = mapWidth;
    var height = noise.length / width;
    
    var smoothNoise = new Array(width*height);
    
    var samplePeriod = Math.floor(Math.pow(2, octave));
    var sampleFrequency = 1.0 / samplePeriod;
    
    for (i = 0; i < width; i++){
      var sample_i0 = Math.floor(Math.floor(i / samplePeriod) * samplePeriod);
      var sample_i1 = Math.floor((sample_i0 + samplePeriod) % width);
      var horizontal_blend = (i - sample_i0) * sampleFrequency;
      
      for (j = 0; j < height; j++){
        var sample_j0 = Math.floor(Math.floor(j / samplePeriod) * samplePeriod);
        var sample_j1 = Math.floor((sample_j0 + samplePeriod) % height);
        var vertical_blend = (j - sample_j0) * sampleFrequency;
        
        var top = Interpolate(noise[sample_j0 * width + sample_i0], 
          noise[sample_j0 * width + sample_i1], horizontal_blend);
        
        var bottom = Interpolate(noise[sample_j1 * width + sample_i0], 
          noise[sample_j1 * width + sample_i1], horizontal_blend);
      
        smoothNoise[j * width + i] = Interpolate(top, bottom, vertical_blend);
      }
    }
    
    return smoothNoise;
  }

  function Interpolate(x0, x1, alpha){
    return x0 * (1-alpha) + alpha * x1;
  }

  function generatePerlinNoise(mapWidth, noise, octave){
    var width = mapWidth;
    var height = noise.length / width;
    
    var smoothNoise = new Array(octave);
    
    var persistance = 0.5;
    
    for (x = 0; x < octave; x++){
      smoothNoise[x] = generateSmoothNoise(mapWidth, noise, x);}
    
    var perlinNoise = new Array(width*height);
    var amplitude = 1.0;
    var totalAmplitude = 0.0;
    
    for (o = octave - 1; o >= 0; o--){
      amplitude *= persistance;
      totalAmplitude += amplitude;
      
      for (i = 0; i < width; i++){
        for (j = 0; j < height; j++){
          perlinNoise[j * width + i] = smoothNoise[o][j * width + i] * amplitude;
        }
      }
    }
    
    for (i = 0; i < width; i++){
      for (j = 0; j < height; j++){
        perlinNoise[j * width + i] = perlinNoise[j * width + i] / totalAmplitude;
      }
    }
    
    return perlinNoise;
  }
  /*END PERLIN NOISE TUTORIAL/CODE*/
  
  return {
    setSeed: setSeed,
    randomNumber: randomNumber,
    generateNoise: generateNoise,
    generateSmoothNoise: generateSmoothNoise,
    generatePerlinNoise: generatePerlinNoise,
  }

}());
},{}],12:[function(require,module,exports){
/* Player module
 * Implements the entity pattern and provides
 * the DiggyHole player info.
 * Authors:
 * - Wyatt Watson
 * - Nathan Bean
 */
module.exports = (function(){
  var Entity = require('./entity.js'),
      Animation = require('./animation.js');
  
  /* The following are player States (Swimming is not implemented) */
  const STANDING = 0;
  const WALKING = 1;
  const JUMPING = 2;
  const DIGGING = 3;
  const FALLING = 4;
  const SWIMMING = 5;

  // The Sprite Size
  const SIZE = 64;

  // Movement constants
  const SPEED = 150;
  const GRAVITY = -250;
  const JUMP_VELOCITY = -600;
  
  //The Right facing dwarf spritesheet
  var dwarfRight = new Image();
  dwarfRight.src = 'DwarfAnimatedRight.png';

  //The left facing dwarf spritesheet
  var dwarfLeft = new Image();
  dwarfLeft.src = "DwarfAnimatedLeft.png";

  //The Player constructor
  function Player(locationX, locationY, layerIndex, inputManager) {
    this.inputManager = inputManager
    this.state = WALKING; 
    this.dug = false; 
    this.downPressed = false;
    this.layerIndex = layerIndex;
    this.currentX = locationX; 
    this.currentY = locationY; 
    this.nextX = 0; 
    this.nextY = 0;
    this.currentTileIndex = 0; 
    this.nextTileIndex = 0;
    this.constSpeed = 15; 
    this.gravity = .5; 
    this.angle = 0; 
    this.xSpeed = 10; 
    this.ySpeed = 15;
    this.isLeft = false;
	this.type = "player";
    
    //The animations
    this.animations = {
      left: [],
      right: [],
    }
    
    //The right-facing animations
    this.animations.right[STANDING] = new Animation(dwarfRight, SIZE, SIZE, SIZE*2, SIZE);
    this.animations.right[WALKING] = new Animation(dwarfRight, SIZE, SIZE, 0, 0, 4);
    this.animations.right[JUMPING] = new Animation(dwarfRight, SIZE, SIZE, SIZE*3, 0);
    this.animations.right[DIGGING] = new Animation(dwarfRight, SIZE, SIZE, 0, SIZE*2, 4);
    this.animations.right[FALLING] = new Animation(dwarfRight, SIZE, SIZE, SIZE, SIZE);
    this.animations.right[SWIMMING] = new Animation(dwarfRight, SIZE, SIZE, 0, 0, 4);
    
    //The left-facing animations
    this.animations.left[STANDING] = new Animation(dwarfLeft, SIZE, SIZE, SIZE*2, SIZE);
    this.animations.left[WALKING] = new Animation(dwarfLeft, SIZE, SIZE, 0, 0, 4);
    this.animations.left[JUMPING] = new Animation(dwarfLeft, SIZE, SIZE, SIZE*3, 0);
    this.animations.left[DIGGING] = new Animation(dwarfLeft, SIZE, SIZE, 0, SIZE*2, 4);
    this.animations.left[FALLING] = new Animation(dwarfLeft, SIZE, SIZE, SIZE, SIZE);
    this.animations.left[SWIMMING] = new Animation(dwarfLeft, SIZE, SIZE, 0, 0, 4);
  }
  
  // Player inherits from Entity
  Player.prototype = new Entity();
  
  // Determines if the player is on the ground
  Player.prototype.onGround = function(tilemap) {
    var box = this.boundingBox(),
        tileX = Math.floor((box.left + (SIZE/2))/64),
        tileY = Math.floor(box.bottom / 64),
        tile = tilemap.tileAt(tileX, tileY, this.layerIndex);   
    // find the tile we are standing on.
    return (tile && tile.data.solid) ? true : false;
  }
  
  // Moves the player to the left, colliding with solid tiles
  Player.prototype.moveLeft = function(distance, tilemap) {
    this.currentX -= distance;
    var box = this.boundingBox(),
        tileX = Math.floor(box.left/64),
        tileY = Math.floor(box.bottom / 64) - 1,
        tile = tilemap.tileAt(tileX, tileY, this.layerIndex);
    if (tile && tile.data.solid) 
      this.currentX = (Math.floor(this.currentX/64) + 1) * 64
  }
  
  // Moves the player to the right, colliding with solid tiles
  Player.prototype.moveRight = function(distance, tilemap) {
    this.currentX += distance;
    var box = this.boundingBox(),
        tileX = Math.floor(box.right/64),
        tileY = Math.floor(box.bottom / 64) - 1,
        tile = tilemap.tileAt(tileX, tileY, this.layerIndex);
    if (tile && tile.data.solid)
      this.currentX = (Math.ceil(this.currentX/64)-1) * 64;
  }
  
  /* Player update function
   * arguments:
   * - elapsedTime, the time that has passed 
   *   between this and the last frame.
   * - tilemap, the tilemap that corresponds to
   *   the current game world.
   */
  Player.prototype.update = function(elapsedTime, tilemap) {
    var sprite = this;
    
    // The "with" keyword allows us to change the
    // current scope, i.e. 'this' becomes our 
    // inputManager
    with (this.inputManager) {
    
      // Process player state
      switch(sprite.state) {
        case STANDING:
        case WALKING:
          // If there is no ground underneath, fall
          if(!sprite.onGround(tilemap)) {
            sprite.state = FALLING;
            sprite.velocityY = 0;
          } else {
            if(isKeyDown(commands.DIG)) {
              sprite.state = DIGGING;
            }
            else if(isKeyDown(commands.UP)) {
              sprite.state = JUMPING;
              sprite.velocityY = JUMP_VELOCITY;
            }
            else if(isKeyDown(commands.LEFT)) {
              sprite.isLeft = true;
              sprite.state = WALKING;
              sprite.moveLeft(elapsedTime * SPEED, tilemap);
            }
            else if(isKeyDown(commands.RIGHT)) {
              sprite.isLeft = false;
              sprite.state = WALKING;
              sprite.moveRight(elapsedTime * SPEED, tilemap);
            }
            else {
              sprite.state = STANDING;
            }
          }
          break;
        case DIGGING:
        case JUMPING:
          sprite.velocityY += Math.pow(GRAVITY * elapsedTime, 2);
          sprite.currentY += sprite.velocityY * elapsedTime;
          if(sprite.velocityY > 0) {
            sprite.state = FALLING;
          }
          if(isKeyDown(commands.LEFT)) {
            sprite.isLeft = true;
            sprite.moveLeft(elapsedTime * SPEED, tilemap);
          }
          if(isKeyDown(commands.RIGHT)) {
            sprite.isLeft = true;
            sprite.moveRight(elapsedTime * SPEED, tilemap);
          }
          break;
        case FALLING:
          sprite.velocityY += Math.pow(GRAVITY * elapsedTime, 2);
          sprite.currentY += sprite.velocityY * elapsedTime;
          if(sprite.onGround(tilemap)) {
            sprite.state = STANDING;
            sprite.currentY = 64 * Math.floor(sprite.currentY / 64);
          }
          else if(isKeyDown(commands.LEFT)) {
            sprite.isLeft = true;
            sprite.moveLeft(elapsedTime * SPEED, tilemap);
          }
          else if(isKeyDown(commands.RIGHT)) {
            sprite.isLeft = false;
            sprite.moveRight(elapsedTime * SPEED, tilemap);
          }
          break;
        case SWIMMING:
          // NOT IMPLEMENTED YET
      }
      
      // Swap input buffers
      swapBuffers();
    }
       
    // Update animation
    if(this.isLeft)
      this.animations.left[this.state].update(elapsedTime);
    else
      this.animations.right[this.state].update(elapsedTime);
    
  }
  
  /* Player Render Function
   * arguments:
   * - ctx, the rendering context
   * - debug, a flag that indicates turning on
   * visual debugging
   */
  Player.prototype.render = function(ctx, debug) {
    // Draw the player (and the correct animation)
    if(this.isLeft)
      this.animations.left[this.state].render(ctx, this.currentX, this.currentY);
    else
      this.animations.right[this.state].render(ctx, this.currentX, this.currentY);
    
    if(debug) renderDebug(this, ctx);
  }
  
  // Draw debugging visual elements
  function renderDebug(player, ctx) {
    var bounds = player.boundingBox();
    ctx.save();
    
    // Draw player bounding box
    ctx.strokeStyle = "red";
    ctx.beginPath();
    ctx.moveTo(bounds.left, bounds.top);
    ctx.lineTo(bounds.right, bounds.top);
    ctx.lineTo(bounds.right, bounds.bottom);
    ctx.lineTo(bounds.left, bounds.bottom);
    ctx.closePath();
    ctx.stroke();
    
    // Outline tile underfoot
    var tileX = 64 * Math.floor((bounds.left + (SIZE/2))/64),
        tileY = 64 * (Math.floor(bounds.bottom / 64));
    ctx.strokeStyle = "black";
    ctx.beginPath();
    ctx.moveTo(tileX, tileY);
    ctx.lineTo(tileX + 64, tileY);
    ctx.lineTo(tileX + 64, tileY + 64);
    ctx.lineTo(tileX, tileY + 64);
    ctx.closePath();
    ctx.stroke();
    
    ctx.restore();
  }
  
  /* Player BoundingBox Function
   * returns: A bounding box representing the player 
   */
  Player.prototype.boundingBox = function() {
    return {
      left: this.currentX,
      top: this.currentY,
      right: this.currentX + SIZE,
      bottom: this.currentY + SIZE
    }
  }
  
  Player.prototype.boundingCircle = function() {
     return {
		 cx: this.currentX + SIZE/2,
		 cy: this.currentY + SIZE/2,
		 radius: SIZE/2
	 }
   }
  
  return Player;

}());
},{"./animation.js":1,"./entity.js":6}],13:[function(require,module,exports){
/* Tilemap engine providing the static world
 * elements for Diggy Hole
 * Authors:
 * - Nathan Bean 
 * - Wyatt Watson
 */
module.exports = (function (){
  var noisy = require('./noise.js'),
      tiles = [],
      tilesets = [],
      layers = [],
      tileWidth = 0,
      tileHeight = 0,
      mapWidth = 0,
      mapHeight = 0,
      cameraX = 0,
      cameraY = 0,
      viewportHalfWidth = 0,
      viewportHalfHeight = 0,
      viewportTileWidth = 0,
      viewportTileHeight = 0;
   
  /* Clamps the provided value to the provided range
   * Arguments:
   * - value, the value to clamp
   * - min, the minimum of the range to clamp value to
   * - max, the maximum of the range to clamp value to
   * Returns:
   *   The clamped value.
   */   
  function clamp(value, min, max) {
    return (value < min ? min : (value > max ? max : value));
  }
  
  /* Resizes the viewport.
   * Arguments:
   * - width, the width of the viewport
   * - height, the height of hte viewport
   */   
  var setViewportSize = function(width, height) {
    viewportHalfWidth = width / 2;
    viewportHalfHeight = height / 2;
    viewportTileWidth = Math.ceil(width / tileWidth) + 2;
    viewportTileHeight = Math.ceil(height / tileHeight) + 2;
  }
  
  /* Sets the camera position
   * Arguments:
   * - x, the upper-left hand x-coordinate of the viewport
   * - y, the upper-left-hand y-coordinate of the viewport
   */
  var setCameraPosition = function(x, y) {
    cameraX = x;
    cameraY = y;
  }
   
  /* Loads the tilemap 
   * - mapData, the JavaScript object
   * - options, options for loading, currently:
   *  > onload, a callback to trigger once the load finishes
   */   
  var load = function(mapData, options) {
      
    var loading = 0;
    
    // Release old tiles & tilesets
    tiles = [];
    tilesets = [];
    
    // Resize the map
    tileWidth = mapData.tilewidth;
    tileHeight = mapData.tileheight;
    mapWidth = mapData.width;
    mapHeight = mapData.height;
    
    if(options.viewport) 
      setViewportSize(options.viewport.width, options.viewport.height);
    else
      setViewportSize(mapData.width * mapData.tilewidth, mapData.height * mapData.tileheight);
    
    // Load the tileset(s)
    mapData.tilesets.forEach( function(tilesetmapData, index) {
      // Load the tileset image
      var tileset = new Image();
      loading++;
      tileset.onload = function() {
        loading--;
        if(loading == 0 && options.onload) options.onload();
      }
      tileset.src = tilesetmapData.image;
      tilesets.push(tileset);
      
      // Create the tileset's tiles
      var colCount = Math.floor(tilesetmapData.imagewidth / tileWidth),
          rowCount = Math.floor(tilesetmapData.imageheight / tileHeight),
          tileCount = colCount * rowCount;
      for(i = 0; i < tileCount; i++) {
        var data = {}
        for (var key in tilesetmapData.tileproperties[i]) {
          data[key] = tilesetmapData.tileproperties[i][key];
        }
        var tile = {
          // Reference to the image, shared amongst all tiles in the tileset
          image: tileset,
          // Source x position.  i % colCount == col number (as we remove full rows)
          sx: (i % colCount) * tileWidth,
          // Source y position. i / colWidth (integer division) == row number 
          sy: Math.floor(i / rowCount) * tileHeight,
          // The tile's data (solid/liquid, etc.)
          data: data
        }
        tiles.push(tile);
      }
    });
    
    // Parse the layers in the map
    mapData.layers.forEach( function(layerData) {
      
      // Tile layers need to be stored in the engine for later
      // rendering
      if(layerData.type == "tilelayer") {
        // Create a layer object to represent this tile layer
        var layer = {
          name: layerData.name,
          width: layerData.width,
          height: layerData.height,
          visible: layerData.visible
        }
      
        // Set up the layer's data array.  We'll try to optimize
        // by keeping the index data type as small as possible
        if(tiles.length < Math.pow(2,8))
          layer.data = new Uint8Array(layerData.data);
        else if (tiles.length < Math.Pow(2, 16))
          layer.data = new Uint16Array(layerData.data);
        else 
          layer.data = new Uint32Array(layerData.data);
      
        // save the tile layer
        layers.push(layer);
      }
    });
  }

  /* Generates a random tilemap
   * Arguments:
   * - width, the width of the tilemap
   * - height, the height of the tilemap
   * - options, options to trigger
   */
  var generate = function(width, height, options) {
    var map = new Array(width*height);
    var noise = noisy.generateNoise(width, height);
    noise = noisy.generatePerlinNoise(width, noise, 7);
    
    var tileWidth = 64, tileHeight = 64;
    var tilesets = [
      {
        firstgid: 0,
        image: "Tileset.png",
        imageheight: 256,
        imagewidth: 256,
        margin: 0,
        name: "Tileset",
        tileproperties: {
          0: { // Sky background
            type: "SkyBackground",
          },
          1: { // Clouds
             type: "Clouds",
          },
          2: { // Sky Earth
            type: "Sky Earth",
            solid: true
          },
          3: { // Gems w grass
            type: "GemsWithGrass",
            solid: true,
            gems: true
          },
          4: { // Dirt w grass
            type: "DirtWithGrass",
            solid: true
          },
          5: { // Stone w grass
            type: "StoneWithGrass",
            solid: true
          },
          6: { // Water
            type: "Water",
            liquid: true
          },
          7: { // Cave background
            type: "CaveBackground",
          },
          8: { // Gems
            type: "Gems",
            solid: true,
            gems: true
          },
          9: { // dirt
            type: "Dirt",
            solid: true,
          },
          10: { // stone
            type: "Stone",
            solid: true,
          },
          11: { // water
            type: "Water",
            liquid: true
          },
          12: { // cave background
            type: "CaveBackground",
          },
          13: { // lava
            type: "Lava",
            liquid: true,
            damage: 10,
          },
          14: { // dark background
            type: "DarkBackground",
          },
          15: { // dug background
            type: "DugBackground",
          }
        },
        spacing: 0,
        tilewidth: 64,
        tileheight: 64
      }
    ]
    
    // Determines where the surface is (and end of the sky)
    var surface = Math.floor(noisy.randomNumber(Math.floor(height*1/8), Math.floor(height*2/8)));  
    
    // Determines where the crust layer of the earth ends
    var midEarth = Math.floor(noisy.randomNumber(Math.floor(height*3/8), Math.floor(height*5/8)) + surface);
	
    // Used to help clump up the sky islands
    var skyEarthCount = 0;
    var cloudCount = 0;
  
    /* As a key the tile numbers are as follows:
     * SkyBackground: 0, Clouds: 1, SkyEarth: 2, GemsWithGrass: 3, DirtWithGrass: 4, StoneWithGrass: 5, Water: 6,
     * CaveBackground: 7, Gems: 8, Dirt: 9, Stone: 10, Water(Again): 11, CaveBackground(Again): 12, Lava: 13, DarkBackground: 14, DugTile: 15
     * you can replace any of the tiles that are unwanted (or wanted) at any point and it will preserve initial functionality*/
    for(j = 0; j < height; j++){
      var rand = noisy.randomNumber(0, 3);
      var rand2 = noisy.randomNumber(0, 1);
      for(i = 0; i < width; i++){
        var index = j * width + i;
        var temp = noise[index];
        //Ensure first row is sky
        if(j == 0){
          map[index] = 1;
        }
        //Sky Area
        else if(j < surface-2){
          if(temp < 8 && skyEarthCount == 0 && cloudCount == 0){ //Sky Background
            map[index] = 1;
          }
          else if(temp < 9.4 && skyEarthCount == 0){ //Clouds
            map[index] = 2;
            cloudCount++;
            if(cloudCount > rand2){
              rand2 = noisy.randomNumber(0, 3);
              cloudCount = 0;
            }
          }
          else{ //Sky Earth
            map[index] = 3;
            skyEarthCount++;
            if(skyEarthCount > rand){
              skyEarthCount = 0;
              rand = noisy.randomNumber(0, 3);
            }
          }
        }
        //Ensure row before the surface is sky
        else if(j < surface){
          map[index] = 1;
        }
        //Surface blocks - Start of Crust Layer
        else if(j == surface){ 
          if(temp < .5){ //Gems w grass
            map[index] = 4;
          }
          else if(temp < 5){ //Dirt w grass
            map[index] = 5;
          }
          else if(temp < 6){ //Stone w grass
            map[index] = 6;
          }
          else if(temp < 8){ //Water 
            map[index] = 7;
          }
          else{ //Cave Background
            map[index] = 13;
          }
        }
        //Crust Area
        else if(j < midEarth-1){
          if(temp < .5){ //Gems
            map[index] = 9;
          }
          else if(temp < 4){ //Dirt
            map[index] = 10;
          }
          else if(temp < 6){ //Stone
            map[index] = 11;
          }
          else if(temp < 8){ //Water 11
            map[index] = 12;
          }
          else{ //Cave Background
            map[index] = 13;
          }
        }
        //Solid layer between crust and deep earth
        else if(j < midEarth){
          if(temp < .5){ //Gems
            map[index] = 9;
          }
          else if(temp < 4){ //Dirt
            map[index] = 10;
          }
          else if(temp < 6){ //Stone
            map[index] = 11;
          }
          else if(temp < 8){ //Water 11
            map[index] = 10;
          }
          else{ //Cave Background
            map[index] = 11;
          }
        }
        //Deep Earth
        else{
          if(temp < 4){ // Lava
            map[index] = 14;
          }
          else if(temp < 6){ // Stone
            map[index] = 11;
          }
          else{ // Dark Background
            map[index] = 15;
          }
        }
      }
    }
    
    // Create mapData object
    var mapData = {
      height: height,
      width: width,
      tilewidth: tileWidth,
      tileheight: tileHeight,
      layers: [{
          data: map,
          name: "Interaction Layer",
          type: "tilelayer",
          height: height,
          width: width,
          visible: true,
          x: 0,
          y: 0
      }],
      tilesets: tilesets,
      options: options
    }
    return load(mapData, options);
  }
  
  
  
  /* GenerateObjectMap generates an object map based on the previously generated game map
   * mapWidth - the overall map's width
   * map - the game map
   * returns: the object map */
  function GenerateObjectMap(mapWidth, map){
    var width = mapWidth;
    var height = map.length / width;

    /* 0 - SB, 1 - C, 2 - SE
       3 - G, 4 - D, 5 - S, 6 - W, 7 - CB
       8      9      10     11     12
       13 - L, 14 - S, 15 - DB */
    
    var objectMap = new Array(width*height);
    var surface = 0;
    
    /* 0 - Nothing
       1 - Player
       2 - Enemy */
    
    /* place enemies (NOT FULLY IMPLEMENTED) and locates the surface of the game map */
    for(i = 0; i < width; i++){
      for(j = 0; j < height; j++){
        var temp = map[j * width + 1];
        var num = noisy.randomNumber(0, 10);
        if(temp < 3){
          if(temp == 2 && j > 0){
            if(num > 9.8)
              objectMap[j-1 * width + i] = 2;
          }
        }
        else if(temp > 2 && temp < 13){
          if(surface == 0)
            surface = j-1;
          if(temp == 7 || temp == 12){
            if(num > 9.8)
              objectMap[j * width + i] = 2;
          }
        }
        else{
          if(temp == 15){
            if(num > 9.8)
              objectMap[j * width + i] = 2;
          }
        }
      }
    }
    
    /*Place player in the middle*/
    objectMap[surface * width + width/2] = 1;
    return objectMap;
  }
  
  /* */
  var render = function(screenCtx) {
    // Render tilemap layers - note this assumes
    // layers are sorted back-to-front so foreground
    // layers obscure background ones.
    // see http://en.wikipedia.org/wiki/Painter%27s_algorithm
    layers.forEach(function(layer){
      // Only draw layers that are currently visible
      if(layer.visible) { 
        
        // Only draw tiles that are within the viewport
        var startX =  clamp(Math.floor(((cameraX - 32) - viewportHalfWidth) / tileWidth) - 1, 0, layer.width);
        var startY =  clamp(Math.floor((cameraY - viewportHalfHeight) / tileHeight) - 1, 0, layer.height);
        var endX = clamp(startX + viewportTileWidth + 1, 0, layer.width);
        var endY = clamp(startY + viewportTileHeight + 1, 0, layer.height);
   
        for(y = startY; y < endY; y++) {
          for(x = startX; x < endX; x++) {
            var tileId = layer.data[x + layer.width * y];
            
            // tiles with an id of < 0 don't exist
            if(tileId > 0) {
              var tile = tiles[tileId-1];
              if(tile.image) { // Make sure the image has loaded
                screenCtx.drawImage(
                  tile.image,     // The image to draw 
                  tile.sx, tile.sy, tileWidth, tileHeight, // The portion of image to draw
                  x*tileWidth, y*tileHeight, tileWidth, tileHeight // Where to draw the image on-screen
                );
              }
            }
            
          }
        }
      }
      
    });
  }
  
  /* Returns the tile at a given position.
   * - x, the x coordinate of the tile
   * - y, the y coordinate of the tile
   * - layer, the layer of the tilemap
   */
  var tileAt = function(x, y, layer) {
    // sanity check
    if(layer < 0 || x < 0 || y < 0 || layer >= layers.length || x > mapWidth || y > mapHeight) 
      return undefined;  
    return tiles[layers[layer].data[x + y*mapWidth] - 1];
  }
  
  // Expose the module's public API
  return {
    load: load,
    generate: generate,
    render: render,
    tileAt: tileAt,
    setViewportSize: setViewportSize,
    setCameraPosition: setCameraPosition
  }
  
  
})();
},{"./noise.js":11}]},{},[10]);
