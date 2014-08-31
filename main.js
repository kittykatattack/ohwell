(function() {

var g = ga(
  360, 640, setup,
  //360, 144, setup,
  //360, 360, setup,
  [
    "tileset.png"
  ]
);
g.start();

//Scale and center the game
var dimension = "height",
    color = "#2C3539";
g.scaleToFit(dimension, color);
window.addEventListener("resize", function(event) { 
  g.scaleToFit(dimension, color);
});

//g.canvas.style.border = "1px white dashed";

var eekBodyFrames, eek, eekBody, eekEyeFrames, eekEyes,
    blocks, newBlock, blockEmitter, world, message,
    blockLayer, objectLayer, camera, statusBar, scoreText,
    score, previousScore, maxHeight, previousMaxHeight, gameScene, titleScene,
    levelTitleScene, levelMessageText, levelScoreText, level, levelStartButton,
    doorEntered, levelText, resetText, resetButton, gameStartButton, highScoreText,
    lethalScore, gameOverTitleScene, gameOverMessageText, gameOverMessageText2, keyboardActive, towerFinished,
    negativeScoreText, negativeScore, levelScore, levelScoreText;

//Grid index (`gid`) number constants used in the collision map
//arrays
var EMPTY = 0,
    EEK = 1,
    MOVING_BLOCK = 2,
    STATIONARY_BLOCK = 3,
    TRANSPARENT_BLOCK = 4;
 
function setup() {

  //localStorage.clear();

  //Create the game world
  world = g.group();
  world.tilewidth = 36;
  world.tileheight = 36;
  world.width = g.canvas.width;
  //Make the height of the world 2 tiles higher than the canvas
  world.topPadding = 0;
  world.height = g.canvas.height //world.tileheight;
  world.widthInTiles = world.width / world.tilewidth;
  world.heightInTiles = world.height / world.tileheight;
  //world.y = -world.tileheight;

  //Make the game object layers and set them to the
  //same width and height as the world
  blockLayer = g.group();
  blockLayer.height = world.height;
  blockLayer.width = world.width;
  objectLayer = g.group();
  objectLayer.height = world.height;
  objectLayer.width = world.width;
  world.add(blockLayer, objectLayer);

  //world.y = -g.canvas.height;
  //Make the game world map arrays
  blockLayer.data = [];
  objectLayer.data = [];
  var numberOfCells = world.heightInTiles * world.widthInTiles;
  //Set all the array elements to `0` which means there's nothing in
  //that cell
  for (var i = 0; i < numberOfCells; i++) {
    blockLayer.data[i] = 0;
    objectLayer.data[i] = 0;
  }

  //Make eek's body
  eekBodyFrames = g.frames(
    "tileset.png",
    [[0,0],[16,0]],
    16, 16
  );
  eekBody = g.sprite(eekBodyFrames);

  //Set the body's fps
  //eekBody.fps = 8;
  eekBody.states = {
    right: 0,
    left: 1
  }

  //Make eek's eyes
  eekEyeFrames = g.frames(
    "tileset.png",
    [[32,0],[48,0],[64,0]],
    16, 16
  );
  eekEyes = g.sprite(eekEyeFrames);

  //Set the eye's states
  eekEyes.states = {
    left: 0,
    right: 1,
    middle: 2
  };

  //Show the eye's `middle` state
  eekEyes.show(eekEyes.states.middle);

  //Make the `eek` group.
  eek = g.group(eekBody, eekEyes);

  //Add eek to the world
  objectLayer.addChild(eek);

  //Add eek's physics properties
  eek.accelerationX = 0;
  eek.accelerationY = 0;
  eek.frictionX = 1;
  eek.frictionY = 1;
  eek.GRAVITY = 0.3;
  eek.gravity = eek.GRAVITY;
  eek.jumpForce = -8.2//-7.5;
  eek.vx = 0;
  eek.vy = 0;
  eek.isOnGround = true;
  eek.paused = false;

  //Give eek a grid index number of 1
  eek.gid = 1;

  //Position eek in the world at the bottom 1/4 of the canvas
  world.put.bottom(eek, 0, -(g.canvas.height / 4));

  //Make a camera a center it over eek
  //camera = worldCamera(world, g.canvas);
  //camera.centerOver(eek);

  //Assign the key actions
  //Assign key `press` methods
  g.key.leftArrow.press = function() {
    if(g.key.rightArrow.isUp && !eek.paused) {
      eekEyes.show(eekEyes.states.left);
      //eekBody.play();
      eekBody.show(eekBody.states.left);
      eek.accelerationX = -0.3;
    }
  };
  g.key.leftArrow.release = function() {
    if(g.key.rightArrow.isUp) {
      eekEyes.show(eekEyes.states.middle);
      //eekBody.stop();
      eek.accelerationX = 0;
    }
  };
  g.key.rightArrow.press = function() {
    if(g.key.leftArrow.isUp && !eek.paused) {
      eekEyes.show(eekEyes.states.right);
      //eekBody.play();
      eekBody.show(eekBody.states.right);
      eek.accelerationX = 0.3;
    }
  };
  g.key.rightArrow.release = function() {
    if(g.key.leftArrow.isUp) {
      eekEyes.show(eekEyes.states.middle);
      //eekBody.stop();
      eek.accelerationX = 0;
    }
  };
  g.key.space.press = function() {
    if(eek.isOnGround && !eek.paused) {
      eek.vy += eek.jumpForce;
      eek.isOnGround = false;
      eek.frictionX = 1;
    }
  };

  //Touch or mouse controls
  world.interactive = true;
  world.press = function() {
    if(!eek.paused) {
      if (g.pointer.x < eek.x) {
        eekEyes.show(eekEyes.states.left);
        //eekBody.play();
        eekBody.show(eekBody.states.left);
        eek.accelerationX = -0.3;
      }
      if (g.pointer.x > eek.x + eek.width) {
        eekEyes.show(eekEyes.states.right);
        //eekBody.play();
        eekBody.show(eekBody.states.right);
        eek.accelerationX = 0.3;
      }
    }
  };
  world.release = function() {
    eekEyes.show(eekEyes.states.middle);
    //eekBody.stop();
    eek.accelerationX = 0;
  };
  world.tap = function() {
    if(eek.isOnGround && !eek.paused && world.x === 0) {
      eek.vy += eek.jumpForce;
      eek.isOnGround = false;
      eek.frictionX = 1;
    }
  };

  /*
  //Test for keyboard
  keyboardActive = false;
  window.addEventListener(
    "keydown", function(){
      keyboardActive = true;
    }, false
  );
  */
  


  //intialize the `blocks` array
  //blocks = [];

  /* ## The blockEmitter */

  blockEmitter = {
    finished: false,
    paused: false,
    START_TIME: 60,
    time: 60,
    increment: 0.5,
    frameCounter: 0,
    lastPosition: undefined,
    positions: [],
    gravity: 0.1,
    colorIndex: 0,
    colors: [
      //0-9
      ["#FFABAB", "#FFDAAB", "#DDFFAB", "#ABE4FF", "#D9ABFF"],
      ["#BCB968", "#ECB3BA", "#CCD4BD", "#9E3B36", "#FCA055"],
      ["#CC353A", "#ADCC6B", "#F1F690", "#6A9674", "#FFA825"],
      ["#FFF381", "#C87CFF", "#B89CFF", "#EBD7FF", "#D05D7E"],
      ["#B2FFA9", "#F5A9FF", "#FFF8D3", "#FFE38F", "#F30303"],
      ["#FFD4DF", "#FDF7DF", "#C7C572", "#7A69F6", "#EE7A7A"],
      ["#E3B0A6", "#E3C4A6", "#E8E3B3", "#A8B8A3", "#AEA3B8"],
      ["#FDDE37", "#CADBF1", "#EE0BAB", "#EEB8E7", "#9233DA"],
      ["#D8D79C", "#8978F2", "#D986E5", "#EFB3C0", "#E54773"],
      ["#5779FF", "#FEFF69", "#C035FF", "#FF2EC3", "#5AFFC2"],
      //10-19
      ["#001449", "#012677", "#005BC5", "#00B4FC", "#17F9FF"],
      ["#F9BA15", "#900402", "#8EAC00", "#127A97", "#452B72"],
      ["#899AA1", "#BDA2A2", "#FBBE9A", "#FAD889", "#FAF5C8"],
      ["#2F2BAD", "#AD2BAD", "#E42692", "#F7DB15", "#58B5A8"],
      ["#434367", "#0A8690", "#86BD55", "#FBEC5F", "#F9A600"],
      ["#EB9D8D", "#93865A", "#A8BB9A", "#C5CBA6", "#EFD8A9"],
      ["#67484D", "#C5AB70", "#F7DFB9", "#DA9B97", "#C95074"],
      ["#AB505E", "#D9A071", "#CFC88F", "#A5B090", "#607873"],
      ["#B877A8", "#B8008A", "#FF3366", "#FFCC33", "#CCFF33"],
      ["#FF0092", "#FFCA1B", "#B6FF00", "#228DFF", "#BA01FF"]
    ],
    emit: function() {
      //Create a block with a random color
      var randomColor = this.colors[this.colorIndex][g.random(0, 4)];
      var block = g.rectangle(36, 36, randomColor);
      //Remember the block's color for later
      block.color = randomColor;
      //Position the block above the top of the world
      block.y = world.y - 30;
      //Give the block a random x position
      block.x = g.random(0, 9) * 36;
      while (block.x === this.positions[this.positions.length - 1]
      ||  block.x === this.positions[this.positions.length - 2]) {
        block.x = g.random(0, 9) * 36;
      }
      this.lastPosition = block.x;
      this.positions.push(block.x);
      //Assign its gravity value
      block.gravity = this.gravity;
      //Give the block a grid id number of 2
      block.gid = MOVING_BLOCK;
      //Add the block to the `blocks` array and add it to the `world`
      //blocks.push(block);
      blockLayer.addChild(block);
    },
    finish: function() {
      this.finished = true;
      var color = "#7FFF00"
      var block = g.rectangle(36, 36, color);
      //Remember the block's color for later
      block.color = color;
      //Position the block above the top of the world
      block.y = world.y - 30;
      //Give the block a random x position
      block.x = g.random(0, 9) * 36;
      while (block.x === this.lastPosition) {
        block.x = g.random(0, 9) * 36;
      }
      //Assign its gravity value
      block.gravity = this.gravity;
      //Give the block a grid id number of 5
      block.gid = MOVING_BLOCK;
      block.name = "door";
      g.pulse(block, 0, 0.02);
      //Add the block to the `blocks` array and add it to the `world`
      //blocks.push(block);
      blockLayer.addChild(block);
    },
    update: function() {
      this.frameCounter++;
      if(!this.finished && !this.paused) {
        if (this.frameCounter >= this.time) {
          this.emit(); 
          this.frameCounter = 0;
        }
      }
    },
    pause: function() {
      this.paused = true;
    },
    resume: function() {
      this.paused = false;
    },
  };
  //Choose a random starting color scheme
  blockEmitter.colorIndex = g.random(0, blockEmitter.colors.length - 1);
  //Start the emitter
  //(The gameStartButton starts it)
  
  //An array to store the score particles
  scoreParticles = [];
 
  //Build the GUI
  buildGUI();

  /* ## The game variables */

  score = 0;
  levelScore = 0;
  //The number of point eek will loose
  negativeScore = 0;
  previousScore = score;
  //The score level at which loosing all you points
  //ends the game
  lethalScoreValue = 1;
  lethalScore = false;
  maxHeight = 0;
  level = 1;
  levelText.content = level + "/99";
  doorEntered = false;
  //The player can only score points for reaching a higher level
  //if the level isn't already finished
  towerFinished = false;

  //Set the game `state` to `play`
  //g.state = play;
}

function play() {

  //Update the status bar
  scoreText.content = "score: " + score;
  currentLevelScoreText.content = levelScore;
  if (negativeScore > 0) {
    negativeScoreText.visible = true;
    negativeScoreText.content = "-" + negativeScore;
  } else {
    negativeScoreText.visible = false;
  }
  if(levelScore - negativeScore <= 0 && negativeScoreText.visible) {
    currentLevelScoreText.fillStyle = "red";
  } else {
    currentLevelScoreText.fillStyle = "#7FFF00";
  }

  //Update the block emitter
  blockEmitter.update();

  //Regulate the amount of friction acting on eek.
  //The is the most important variable to set if you want to
  //fine-tune the feel of the eek control
  if (eek.isOnGround) {
    //Add some friction if eek is on the ground
    eek.frictionX = 0.92;
  } else {
    //Add less friction if it's in the air
    eek.frictionX = 0.97;
  }

  //Apply the acceleration
  eek.vx += eek.accelerationX;
  eek.vy += eek.accelerationY;

  //Apply friction
  eek.vx *= eek.frictionX;

  //Apply gravity
  eek.vy += eek.gravity;

  //Stop eek from moving if the pointer is centered over eek
  if(g.pointer.x > eek.x && g.pointer.x < eek.x + eek.width && g.pointer.isDown) {
    if (Math.abs(eek.vx) !== 0) {
      eek.accelerationX = 0;
      eek.vx *= 0.9;
      eekBody.stop();
    }
  }

  //Stop eek's body animation if eek is moving slowly 
  //if (Math.abs(eek.vx) < 0.1) eekBody.stop();

  //Stop eek's walking animation if it's not on the ground
  if (!eek.isOnGround) eekBody.stop();

  //Move `eek` and contain it to the stage boundary
  g.move(eek);

  //Make the camera follow eek
  //camera.follow(eek);

  /*
  if (eek.y <= world.tileheight) {
    camera.height = g.canvas.height - (world.tileheight * 2);
  } else {
    camera.height = g.canvas.height;
  }
  */

  var eekVsStage = g.contain(eek, world.localBounds);
  if (eekVsStage === "bottom") {
    eek.isOnGround = true;
    //Neutralize gravity by applying its
    //exact opposite force to the character's vy
    eek.vy = -eek.gravity;
  }
  if (eekVsStage === "top") {
    eek.vy = 0;
  }

  /*
  if (world.y < 0) {
    if (eek.y > g.canvas.height / 2) {
      eek.y = g.canvas.height / 2;
      world.y += eek.vy;
    }
    if (eek.y < (g.canvas.height - (g.canvas.height / 4))) {
      eek.y = g.canvas.height / 4;
      world.y += eek.vy;
    }
  }
  */

  //Find eek's index number
  eek.index = g.getIndex(
    eek.centerX, eek.centerY,
    world.tilewidth, world.tileheight, world.widthInTiles
  );

  //Get an array of all the index numbers of cells surroundng eek
  var cellsAroundEek = g.surroundingCells(eek.index, world.widthInTiles);

  //The falling blocks
  blockLayer.children.forEach(function(b1, index) {
    //Apply gravity
    b1.vy += b1.gravity;
    if (levelScore - negativeScore <= 0 && b1.vy !== 0 && lethalScore) {
      b1.fillStyle = "red";
    } 
    //Move the blocks
    g.move(b1);
    //Check for collision with the bottom of the world
    if (b1.y + b1.height > world.height) {
      //Position the block at the bottom of the world
      b1.y = world.height - b1.height;
      //stop it from moving
      b1.gravity = 0;
      b1.vy = 0;
      //Set the `gid` to `3`, which means the block is not moving
      b1.gid = 3;
      //Set the block to its original color
      b1.fillStyle = b1.color;
    }

    //Check for a collision with eek
    if (b1.gid !== TRANSPARENT_BLOCK && cellsAroundEek.indexOf(b1.index) !== 0) {
      if (b1.name !=="door") {
        var eekVsBlock = g.rectangleCollision(eek, b1);
        //Use the collision variable to figure out what side of the player
        //is hitting the platform
        if(eekVsBlock  === "bottom" && eek.vy >= 0) {
          //Tell the game that the eek is on the ground if
          //it's standing on top of a platform
          eek.isOnGround = true;
          //Neutralize gravity by applying its
          //exact opposite force to the character's vy
          eek.vy = -eek.gravity;
          //Update the score if eek has reached a new high altitude
          var level = Math.floor((world.height - eek.centerY) / world.tileheight);
          if (level > maxHeight && !towerFinished) {
            var difference = level - maxHeight;
            levelScore += difference;
            score += difference;
            maxHeight = level;
            makeScoreParticle(score, eek.y - 32, "#7FFF00");
            //If the score is at the value at which loosing all your
            //points becomes lethal, set `lethalScore` to `true` 
            if (score >= lethalScoreValue) lethalScore = true;
            //Check for a new high score
            var highScore = parseInt(localStorage.getItem("highScore"));
            if (score > highScore) {
              localStorage.setItem("highScore", score);
            }
          }
        }
        else if(eekVsBlock === "top" && eek.vy <= 0) {
          eek.vy = 0;
          if (b1.vy !== 0) {
            //Get eek's current level and find out the difference between it
            //and the deepest column
            //negativeScore = getNegativeScore();
            //Reduce the score by the difference, down to a minimum of zero
            levelScore -= negativeScore;
            score -= negativeScore;
            if (levelScore < 0) levelScore = 0;
            if (score < 0) score = 0;
            console.log("score: " + score + ", levelScore: " + levelScore);
            if (levelScore === 0 && lethalScore) {
              endGame();
            } else {  
              removeEek();
            }
          } else {
            if (levelScore > 0) {
              removeBlock(b1, "white");
              levelScore -= 1;
              score -= 1;
              makeScoreParticle(-1, eek.y - 64, "red");
              if (levelScore < 0) levelScore = 0;
              if (score < 0) score = 0;
              /*
              if (levelScore === 0 && lethalScore) {
                endGame();
              } 
              */
            }
          }
        }
        else if(eekVsBlock === "right" && eek.vx >= 0) {
          eek.vx = 0;
        }
        else if(eekVsBlock === "left" && eek.vx <= 0) {
          eek.vx = 0;
        }
        //Set `isOnGround` to `false` if the bottom of the eek
        //isn't touching the platform
        if(eekVsBlock !== "bottom" && eek.vy > 0) {
          eek.isOnGround = false;
        }
      }
      else {
        var eekVsDoor = g.hitTestRectangle(eek, b1);
        if (eekVsDoor) {
          if (!doorEntered) {
            switchLevel();
            doorEntered = true;
          }
        }
      }
    }
  });

  //Update the blockLayer map array with the new block positions
  blockLayer.data = g.updateMap(blockLayer.data, blockLayer.children, world);

  //A variable to help check if a new top layer has been added to
  //stack of blocks
  var topLayerAdded = false;

  //Loop through the world map array and check for collisions
  blockLayer.data.forEach(function(gid, index){
    //Get the `gid` numbers for significant cells
    var currentCell = blockLayer.data[index];
        cellBelow = blockLayer.data[index + world.widthInTiles];
        cellRight = blockLayer.data[index + 1];
        cellLeft = blockLayer.data[index + 1];
        //cellBelowRight = world.data[index + world.widthInTiles + 1];
        //cellBelowLeft = world.data[index + world.widthInTiles - 1];

    //Check to see if a moving block (2) is above a stationary block (3)
    if (currentCell === MOVING_BLOCK && cellBelow === STATIONARY_BLOCK
    || currentCell === MOVING_BLOCK && cellBelow === TRANSPARENT_BLOCK) {
      //There's a moving block directly above a stationary block
      //find out which block sprites these are
      var movingBlock, blockBelow, blockRight, blockLeft;

      blockLayer.children.forEach(function(block) {
        if (block.index === index) {
          movingBlock = block;
        }
        if (block.index === index + world.widthInTiles) {
          blockBelow = block;
        }
        if (block.index === index + 1) {
          blockRight = block;
        }
        if (block.index === index - 1) {
          blockLeft = block;
        }
      });
      //Do a narrowphase collision test between the blocks
      var blockVsBlock = g.rectangleCollision(movingBlock, blockBelow);
      if(blockVsBlock  === "bottom" && movingBlock.vy >= 0) {
        //Stop the top block from moving when it hits the bottom
        //block
        movingBlock.vy = 0;
        movingBlock.gravity = 0;
        //Set the `gid` to `3` to indicate that the block is not
        //moving
        movingBlock.gid = STATIONARY_BLOCK;
        //Set the block to its original color
        movingBlock.fillStyle = movingBlock.color;
        negativeScore = getNegativeScore();
        //Check to see if any of the surrounding blocks are the same
        //color and make them transparent if they are. Prevent edge
        //cells from affecting matching cells on the opposite side of
        //the screen.
        if (blockBelow && blockBelow.color === movingBlock.color) {
          removeBlock(movingBlock, "white");
          removeBlock(blockBelow, "white");
        }
        if (blockRight && blockRight.color === movingBlock.color
        && (index + 1) % world.widthInTiles !== 0) {
          removeBlock(movingBlock, "white");
          removeBlock(blockRight, "white");
        }
        if (blockLeft && blockLeft.color === movingBlock.color
        && index % world.widthInTiles !== 0) {
          removeBlock(movingBlock, "white");
          removeBlock(blockLeft, "white");
        }
        //Find out if a non-moving block is at the top of the canvas.
        //(within the top 3 world rows)
        //If it is, add a new row to the world map arrays
        if (movingBlock.index < (world.widthInTiles * 3)) {
          topLayerAdded = true;
          //console.log("index: " + movingBlock.index)
          //console.log("y: " + movingBlock.y)
        }
      }
    }
  });


  //If a new top layer is added, add a new row to the world
  if(topLayerAdded) {
    //addNewMapRow();
    towerFinished = true;
    addDoor();
  }

}

function getNegativeScore() {
  var eeksDepth = Math.abs(Math.floor((0 - eek.centerY) / world.tileheight)),
      deepest = findDeepestColumn(),
      difference = deepest.depth - eeksDepth;

  if (difference > 0) {
    return difference;
  } else {
    return 0;
  }
}

function endGame(){
  burst(eek);
  g.shake(blockLayer);
  makeScoreParticle(-negativeScore, eek.y - 64, "red");
  g.pause();
  blockEmitter.finsihed = true;
  blockEmitter.pause();
  eek.alpha = 0;
  g.wait(3000, function(){
    displayGameOver(); 
  });

  function displayGameOver() {
    gameOverMessageText2.content = "Score: " + score;
    scoreText.content = "score: 0";
    highScoreText.content = "high score: " + parseInt(localStorage.getItem("highScore"));
    g.slide(gameOverTitleScene, 0, 0, 0.3);
    g.slide(gameScene, -g.canvas.width, 0, 0.3);
    g.wait(4000, function(){
      g.slide(gameOverTitleScene, g.canvas.width, 0, 0.3);
      var titleSlide = g.slide(titleScene, 0, 0, 0.3);
      gameStartButton.release = function() {
        createNewLevel("restart");
        g.slide(titleScene, g.canvas.width, 0, 0.3);
        var gameSlide = g.slide(gameScene, 0, 0, 0.3);
        gameSlide.onComplete = function() {
          g.resume();
        };
      };
    });
  }
}


function removeEek() {
  //g.remove(eek);
  //console.log("eek!");
  burst(eek);
  makeScoreParticle(-negativeScore, eek.y - 64, "red");
  blockEmitter.pause();
  eek.paused = true;
  eek.alpha = 0;
  eek.vx = 0;
  eek.vy = 0;
  setNewPosition();
  //eek.x = 0;
  //eek.y = 0;
  eek.gravity = 0;

  g.wait(2000, function(){
    g.pause();
    reset();
  });

  function reset() {
    var fadeInEek = g.fadeIn(eek, 0.02);
    fadeInEek.onComplete = function() {
      g.resume();
      eek.gravity = eek.GRAVITY;
      eek.paused = false;
      eek.vx = 0;
      eek.vy = 0;
      blockEmitter.resume();
    };
  }
  function setNewPosition() {
    //Set eek to a position near the bottom of the deepest column
    var deepest = findDeepestColumn(),
        randomX = (deepest.column * world.tilewidth) + ((world.tilewidth / 2) - (eek.width / 2));

    //Set eek to the new position
    eek.y = world.height - 200 - (world.height - (deepest.depth * world.tileheight));
    eek.x = randomX;
  }
}

//A function that returns an object that tells you which column is 
//the deepest, and how deep that column is. If more than one column
//is the same depth, a random column is chosen
function findDeepestColumn() {
  var i, j, 
      rowCounter = 0, 
      deepest = 0, 
      deepestColumn = 0, 
      depths = [],
      deepestColumns = [],
      randomDeepest = 0;

  //Loop through all the columns
  for (i = 0; i < world.widthInTiles; i++) {
    rowCounter = 0;
    for (j = 0; j < world.heightInTiles; j++) {
      var cell = blockLayer.data[(j * world.widthInTiles) + i];
      //If a column cell doesn't contain anything, add 1 1 to the
      //row counter
      if (cell === EMPTY) rowCounter += 1;
    }
    //If this row is deepest so far, make a note of the depth
    if (rowCounter > deepest) {
      deepest = rowCounter;
    }
    //Push the `rowCounter`'s depth value into the `depths` array
    depths.push(rowCounter)
  }
  //Loop through the `depths` array and push the index numbers
  //(which represent the column numbers) into the `deepestColumns`
  //array
  depths.forEach(function(depth, index){
    if (depth === deepest) deepestColumns.push(index);
  });
  //Choose a random deepest column number
  randomDeepest = deepestColumns[g.random(0, deepestColumns.length - 1)];
  //console.log("deepest: " + deepest + ", depths: " + depths.toString() + ", deepestColumns: " + deepestColumns + ", random: " + randomDeepest);
  //Return an object that includes a random deep column number and
  //its depth
  return {
    column: randomDeepest,
    depth: deepest
  };
}

function makeScoreParticle(score, y, color) {
  if (score) {
    var particle = g.text(score, "24px Futura, sans-serif", color);
    particle.alpha = 0;
    particle.setPosition(eek.x + 4, y);
    if (particle.x > g.canvas.width - 32) {
      particle.x = g.canvas.width - 32;
    }
    if (particle.x < 8) {
      particle.x = 8;
    }
    var particleFade = g.fadeIn(particle, 0.04);
    particleFade.onComplete = function(){
      g.fadeOut(particle, 0.04);
    };
    particle.update = function() {
      particle.y -= 0.5;
      //particle.scaleX += 0.01;
      //particle.scaleY += 0.01;
      //Remove the particle if its `alpha` reaches zero
      if (particle.alpha <= 0) {
        g.remove(particle);
        g.particles.splice(g.particles.indexOf(particle), 1);
      }
    };
    g.particles.push(particle);
  }
}

function addDoor() {
  if (!blockEmitter.finished) {
    blockEmitter.finish();
  }
}

//A function to fadeout and remove the blocks
function removeBlock(block, color) {
  block.fillStyle = color;
  block.gid = TRANSPARENT_BLOCK;
  var fade = g.fadeOut(block, 0.02, 0.3);
  fade.onComplete = function() {
    block.color = "white";
  };
}

function resetLevel() {
  g.pause();
  blockEmitter.finished = true;
  g.wait(1000, function(){
    displayTitle(); 
  });

  function displayTitle() {
    g.slide(resetTitleScene, 0, 0, 0.3);
    g.slide(gameScene, -g.canvas.width, 0, 0.3);
    g.wait(2000, function(){
      createNewLevel("reset");
      g.slide(resetTitleScene, g.canvas.width, 0, 0.3);
      var gameSlide = g.slide(gameScene, 0, 0, 0.3);
      gameSlide.onComplete = function() {
        g.resume();
      };
    });
  }
}

function switchLevel() {
  g.fadeOut(eek, 0.15)
  g.wait(300, function(){
    g.pause();
    g.wait(1000, function(){
      displayTitle();
    });
  });

  function displayTitle() {
    g.slide(levelTitleScene, 0, 0, 0.3);
    g.slide(gameScene, -g.canvas.width, 0, 0.3);

    if (level !== 99) {
      //Display the level complete messages
      levelMessageText.content = "Level " + level + " Complete!";
      levelScoreText.content = "Score: " + score;
      //Program the button
      levelStartButton.release = function() {
        createNewLevel();
        g.slide(levelTitleScene, g.canvas.width, 0, 0.3);
        var gameSlide = g.slide(gameScene, 0, 0, 0.3);
        gameSlide.onComplete = function() {
          g.resume();
        };
      }
    }
    //Display the game over message
    else {
      levelMessageText.content = "You Finished!";
      levelMessageText.x += 38;
      levelScoreText.content = "Final score: " + score;
      levelScoreText.x -= 24;
      //Set the new high score
      var highScore = parseInt(localStorage.getItem("highScore"));
      if (score > highScore) {
        localStorage.setItem("highScore", score);
      }
      highScoreText.content = "high score: " + parseInt(localStorage.getItem("highScore"));
      //Program the button to display the `titleScene`
      levelStartButton.release = function() {
        g.slide(levelTitleScene, g.canvas.width, 0, 0.3);
        var titleSlide = g.slide(titleScene, 0, 0, 0.3);
        gameStartButton.release = function() {
          createNewLevel("restart");
          g.slide(titleScene, g.canvas.width, 0, 0.3);
          var gameSlide = g.slide(gameScene, 0, 0, 0.3);
          gameSlide.onComplete = function() {
            g.resume();
          };
        };
      };
    }
  }
}

function createNewLevel(levelType) {
  //Increase the level by one
  if (levelType === "reset") {
    if (score - levelScore >= 0) {
      score -= levelScore;
      levelScore = 0;
    } else {
      levelScore = 0;
      score = 0;
    }
  } 
  else if (levelType === "restart") {
    level = 1;
    levelText.content = level + "/99";
    score = 0;
    lethalScore = false;
    previousScore = 0;
    levelScoreText.content = "Final score: " + score;
    levelMessageText.x = 42;
    levelScoreText.x = 104;
    blockEmitter.time = blockEmitter.START_TIME;
  }
  else {
    level += 1;
    levelText.content = level + "/99";
    //Remember the score achieved at this level
    previousScore = levelScore;
  }

  //Set the new high score, if it's been attained
  var highScore = parseInt(localStorage.getItem("highScore"));
  if (score > highScore) {
    localStorage.setItem("highScore", score);
  }

  //Reset the `maxHeight`
  maxHeight = 0;

  //Clear the game objects and add eek back in
  blockLayer.children = [];
  objectLayer.chldren = [];
  objectLayer.addChild(eek);

  //Reset eek
  eek.alpha = 1;
  eek.visible = true;
  eek.vy = 0;
  eek.vx = 0;

  //Position eek in the world at the bottom 1/4 of the canvas
  world.put.bottom(eek, 0, -(g.canvas.height / 4));

  //Start the emitter
  blockEmitter.finished = false;
  blockEmitter.frameCounter = 0;
  blockEmitter.resume();
  //blockEmitter.colorIndex = level - 1;
  blockEmitter.colorIndex += 1
  
  if (blockEmitter.colorIndex > blockEmitter.colors.length - 1) {
    blockEmitter.colorIndex = 0;
  }
  
  //Reduce the time by the block emitter's increment amount
  blockEmitter.time -= blockEmitter.increment;

  //Reset game variables
  doorEntered = false;
  towerFinished = false;
  negativeScore = 0;
  if (levelType !== "reset") levelScore = 0;
  negativeScoreText.visible = false;
  currentLevelScoreText.fillStyle = "#7FFF00";
}

function burst(sprite) {
  g.burst(
    sprite.x, sprite.y,    //x and y
    function(){            //A function that returns the sprite to use for the particle
      return g.sprite(g.frame("tileset.png", 80, 0, 16, 16));
    },
    g.random(5, 10),      //number
    10, 26,                //size
    3, 0.5,               //speed
    0.01, 0.05,           //scale speed
    0.01, 0.02,           //alpha speed
    0.01, 0.03            //rotation speed
  );
}

//All the GUI screens are built here
function buildGUI() {
  /* ## The status bar */

  statusBar = g.rectangle(g.canvas.width, world.tileheight, "#2F2F2F");
  var borderLine = g.line(
    "#616161", 1,
    0, world.tileheight - 1,
    g.canvas.width, world.tileheight - 1
  );
  //Score text
  scoreText = g.text("score: 0", "20px Futura, sans-serif", "white");
  scoreText.setPosition(72, 6);
  currentLevelScoreText = g.text("0", "20px Futura, sans-serif", "#7FFF00");
  currentLevelScoreText.setPosition(8, 6);
  //Negative score text
  negativeScoreText = g.text("0", "20px Futura, sans-serif", "yellow");
  negativeScoreText.setPosition(38, 6);
  negativeScoreText.visible = false;
  //Level text
  levelText = g.text("1/99", "20px Futura, sans-serif", "white");
  levelText.setPosition(240, 6);
  //Reset button
  resetText = g.text("reset", "20px Futura, sans-serif", "white");
  resetButton = g.rectangle(64, world.tileheight - 3, "#2F2F2F");
  resetButton.addChild(resetText);
  resetText.setPosition(8, 2);
  statusBar.put.right(resetButton, -resetButton.width, 0);
  resetButton.interactive = true;
  resetButton.over = function() {
    resetText.fillStyle = "#7FFF00";
  };
  resetButton.out = function() {
    resetText.fillStyle = "white";
  };
  resetButton.release = function() {
    resetLevel();
  };
  statusBar.add(borderLine, currentLevelScoreText, scoreText, negativeScoreText, levelText, resetButton);

  //Build the resetTitleScene
  resetTitleScene = g.rectangle(g.canvas.width, g.canvas.height, "black");
  resetMessageText = g.text("Resetting the level...", "32px Futura, sans-serif", "white");
  resetTitleScene.addChild(resetMessageText);
  resetMessageText.y = (g.canvas.height / 2) - (resetMessageText.height * 2);
  resetMessageText.x = 42;
  resetTitleScene.x = g.canvas.width;

  //Build the `gameScene`
  gameScene = g.group(world, statusBar);
  gameScene.x = -g.canvas.width;

  //Build the levelTitleScene
  levelTitleScene = g.rectangle(g.canvas.width, g.canvas.height, "black");
  levelMessageText = g.text("Level 1 Complete!", "32px Futura, sans-serif", "white");
  levelMessageText.y = (g.canvas.height / 4) - (levelMessageText.height * 2);
  levelMessageText.x = 42;
  levelScoreText = g.text("Score: 57", "32px Futura, sans-serif", "white");
  levelScoreText.y = (g.canvas.height / 2) - (levelScoreText.height * 2);
  levelScoreText.x = 104;
  var buttonBackground = g.rectangle(world.tilewidth * 2, world.tileheight + 14, "#7FFF00");
  g.pulse(buttonBackground, 0, 0.02);
  var buttonText = g.text("Go!", "32px Futura, sans-serif", "white");
  levelStartButton = g.group(buttonBackground, buttonText);
  buttonText.x = 8;
  buttonText.y = 4;
  levelTitleScene.put.bottom(levelStartButton, 0, -g.canvas.height / 4);
  levelStartButton.interactive = true;
  levelTitleScene.add(levelMessageText, levelScoreText, levelStartButton);
  levelTitleScene.x = g.canvas.width;

  //Build the `titleScene`
  //Instructions
  var instructions = g.group();
  var instructionFont = "16px 'Book Antiqua', 'Big Caslon', serif";
  var st1 = g.text("A jumping game for children.", instructionFont, "white");
  var st2 = g.text("Try and survive as long as you can!", instructionFont, "white");
  var st3 = g.text("Made by Kittykatattack!", instructionFont, "white");
  var st4 = g.text("(www.kittykatattack.com)", instructionFont, "white");
  var st5 = g.text("Using the `Ga` game engine.", instructionFont, "white");
  var st6 = g.text("(github.com/kittykatattack/ga)", instructionFont, "white");
  instructions.add(st1, st2, st3, st4, st5, st6);
  st1.x = 20;
  st2.y = st1.y + 28;
  st3.y = st2.y + 200;
  st3.x = 40;
  st4.y = st3.y + 28;
  st4.x = 34;
  st5.y = st4.y + 28;
  st5.x = 28;
  st6.y = st5.y + 28;
  st6.x = 18;
  instructions.setPosition(-g.canvas.width, 275);

  //The game start button
  var startButtonBackground = g.rectangle(world.tilewidth * 2, world.tileheight + 14, "#7FFF00");
  g.pulse(startButtonBackground, 0, 0.02);
  var startButtonText = g.text("Go!", "32px Futura, sans-serif", "white");
  gameStartButton = g.group(startButtonBackground, startButtonText);
  startButtonText.x = 8;
  startButtonText.y = 4;
  instructions.addChild(gameStartButton);
  gameStartButton.setPosition(96, st2.y + 52);
  gameStartButton.interactive = true;
  gameStartButton.release = function() {
    g.slide(titleScene, g.canvas.width, 0, 0.3);
    var gameSlide = g.slide(gameScene, 0, 0, 0.3);
    gameSlide.onComplete = function() {
      blockEmitter.resume();
      g.state = play;
    };
  };

  //The highscore text
  var highScore = parseInt(localStorage.getItem("highScore"));
  if (!highScore) {
    highScore = 0;
    localStorage.setItem("highScore", highScore);
  }
  highScoreText = g.text("high score: " + highScore, "28px Futura, sans-serif", "white");
  instructions.addChild(highScoreText);
  highScoreText.setPosition(32, gameStartButton.y + 72);

  titleScene = g.rectangle(g.canvas.width, g.canvas.height, "black");
  var oh = g.text("Oh", "72px 'Book Antiqua', 'Big Caslon', serif", "white");
  oh.setPosition(g.canvas.width, 96);
  var slideOh = g.slide(oh, 96, 96, 0.3);
  var well = g.text("Well!", "72px 'Book Antiqua', 'Big Caslon', serif", "white");
  well.setPosition(-75, 164);
  slideOh.onComplete = function(){
    var slideWell = g.slide(well, 128, 164, 0.3);
    slideWell.onComplete = function(){
      g.slide(instructions, 52, 275, 0.3);
    };
  };

  titleScene.add(oh, well, instructions);
  
  //Build the gameOverTitleScene
  gameOverTitleScene = g.rectangle(g.canvas.width, g.canvas.height, "black");
  gameOverMessageText = g.text("Game Over!", "32px Futura, sans-serif", "white");
  gameOverMessageText2 = g.text("Score: 0", "32px Futura, sans-serif", "white");
  gameOverTitleScene.add(gameOverMessageText, gameOverMessageText2);
  gameOverMessageText.y = (g.canvas.height / 2) - (gameOverMessageText.height * 2) -64;
  gameOverMessageText.x = 86;
  gameOverMessageText2.y = (g.canvas.height / 2) - (gameOverMessageText2.height * 2) +64;
  gameOverMessageText2.x = 112;
  gameOverTitleScene.x = g.canvas.width;
}
//Add new map array rows and increase the height of the world
/*
function addNewMapRow() {
  var maxHeight = g.canvas.height * 2;

  //Add a top row to the game world if the height of the world is
  //less than double the height of the canvas
  if (world.height < maxHeight) {
    addTopRow();
  }
  //If the height of the world is double the height of the canvas
  //or greater, remove the world's bottom row of blocks.
  else {
    addTopRow();
    removeBottomRow();
  }
  //Add a top row
  function addTopRow() {
    for(var i = 0; i < world.widthInTiles; i++) {
      //Add a row of zeros to the beginnging of each map array
      blockLayer.data.unshift(0);
      objectLayer.data.unshift(0);
    }
    //Increase the height of the world by the height of one tile
    world.height += world.tileheight;
    blockLayer.height = world.height;
    objectLayer.height = world.height;
    world.y -= world.tileheight;
    //Shift the sprites in each layer down by the height of one tile.
    //This keeps them aligned properly
    blockLayer.children.forEach(function(child){
      child.y += world.tileheight;
    });
    objectLayer.children.forEach(function(child){
      child.y += world.tileheight;
    });
    //Shift the camera position
    //camera.y += world.tileheight;
    console.log("row added");
  }
  //Remove the bottom row
  function removeBottomRow() {

    //Decrease the height of the world by the height of one tile
    world.height -= world.tileheight;
    blockLayer.height = world.height;
    objectLayer.height = world.height;
    world.y += world.tileheight;
    //Remove a row of data at the end of each map array
    var i;
    for(i = 0; i < world.widthInTiles; i++) {
      blockLayer.data.pop();
      objectLayer.data.pop();
    }
    //Remove a row of sprites at the bottom of the `blockLayer`
    blockLayer.children = blockLayer.children.filter(function(child){
      if (child.y >= maxHeight) {
        return false;
      } else {
        return true;
      }
    });
    objectLayer.children = objectLayer.children.filter(function(child){
      if (child.y >= maxHeight) {
        return false;
      } else {
        return true;
      }
    });
    //Shift the camera position
    //camera.y += world.tileheight;

    console.log("row removed");

  }
}
*/
})();
