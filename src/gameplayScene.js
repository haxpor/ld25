var COLLISION_GROUP = {
	GROUND: 99,
	TRIDEROCHE:1,
	TRIDEROCHE_FOOT:2,
	GOAT:3
}

var GameplaySetting = {
	CAMERA_SPEED:0.15
}

var GameplayLayer = cc.LayerColor.extend({
	space:null,

	// flags & info
	isGameOver:false,
	timeRecord:-1,	// in secs
	timeRecordLabel:null,

	// objects
	trideroche:null,
	camPos:null,
	levelInfo:null,

	_debugNode:null,
	_goatSprite:null,	// list of goat sprites
	_groundShapes:[],

	initWithLevel:function(color, level) {
		if(!this.init(color))
		{
			global.log("GameplayLayer's init() called failed.");
			return false;
		}

		var winSize = cc.Director.getInstance().getWinSize();

		// load sprites
		global.loadSpriteFrames(res_humanSpriteSheetPlist);

		// init the less
		this.isGameOver = false;
		// add time record label
		this.timeRecordLabel = cc.LabelTTF.create("00:00", "AtariClassic", 15);
		this.timeRecordLabel.setPosition(cc.p(winSize.width - this.timeRecordLabel.getContentSize().width, winSize.height-20));
		this.timeRecordLabel.setColor(cc.c3b(255,255,255));
		this.addChild(this.timeRecordLabel, 10);

		// create chipmunk space
		this.setupPhysicsWithLevel(level);
		this.setupPhysicsDebugNode();

		// create trideroche & add into the physics and scene
		this.trideroche = new Trideroche(this.space, this, cc.p(130, winSize.height/2.5));
		this.camPos = cc.p(this.trideroche.body.getPos().x, this.trideroche.body.getPos().y);

		// enable mouse and keyboard
		this.setMouseEnabled(true);
		this.setKeyboardEnabled(true);
		// create an update function
		this.scheduleUpdate();

		// schedule to maintain the head level of triceroche
		this.schedule(this._maintainTriderocheHead, 0.4);
		this.schedule(this._updateTimeRecord, 1.0);

		return true;
	},
	// set up chipmunk space
	setupPhysicsWithLevel:function(level) {
		this.space = new cp.Space();
		this.space.gravity = cp.v(0, -200);
		this.space.iterations = 20;

		// add ground
		var winSize = cc.Director.getInstance().getWinSize();
		var staticBody = this.space.staticBody;

		// build level
		this.levelInfo = levels[level-1];
		for(var i=0; i<this.levelInfo.grounds.length; i++)
		{
			var ground = new cp.PolyShape(staticBody, this.levelInfo.grounds[i].verts, cp.v(0,0));

			ground.setElasticity(0.5);
			ground.setFriction(1);
			ground.shape = COLLISION_GROUP.GROUND;
			ground.setCollisionType(COLLISION_GROUP.GROUND);

			this.space.addStaticShape(ground);

			// save ground into list
			this._groundShapes.push(ground);
		}

		// add goat
		this.addGoat(cc.p(this.levelInfo.goatPosition.x, this.levelInfo.goatPosition.y));
	},
	setupPhysicsDebugNode:function () {
		this._debugNode = cc.PhysicsDebugNode.create(this.space);
		this._debugNode.setVisible(true);
		this.addChild(this._debugNode);
	},
	addBox:function (p) {
		var space = this.space;

		var width = 50;
		var height = 50;
		var mass = width * height * 1/1000;
		var box = new cp.Body(mass, cp.momentForBox(mass, width, height));
		box.setPos(cp.v(p.x, p.y));
		space.addBody(box);

		var shape = new cp.BoxShape(box, width, height);
		shape.setFriction(0.3);
		shape.setElasticity(0.3);
		space.addShape(shape);
	},
	addGoat:function (p) {
		var goat = Goat.create(this.space, p);
		this.addChild(goat);
		this._goatSprite = goat;
	},
	addCar:function (p) {
		var pos = cp.v(p.x, p.y);

		var wheel1 = this._addWheel_forCar(cp.v.add(cp.v(15,-20), pos));
		var wheel2 = this._addWheel_forCar(cp.v.add(cp.v(65,-20), pos));
		var chassis = this._addChassis_forCar(cp.v.add(cp.v(40, 15), pos));

		// relative constraint
		this.space.addConstraint(new cp.GrooveJoint(chassis, wheel1, cp.v(-25,-10), cp.v(-25,-50), cp.v(0,0)));
		this.space.addConstraint(new cp.GrooveJoint(chassis, wheel2, cp.v( 25,-10), cp.v( 25,-50), cp.v(0,0)));

		this.space.addConstraint(new cp.DampedSpring(chassis, wheel1, cp.v(-25,0), cp.v(0,0), 50, 400, 20));
		this.space.addConstraint(new cp.DampedSpring(chassis, wheel2, cp.v(25,0), cp.v(0,0), 50, 400, 20));
	},
	_addWheel_forCar:function (cpV) {
		var radius = 15;
		var mass = 1;
		var body = new cp.Body(mass, cp.momentForCircle(mass, 0, radius, cp.v(0,0)));
		body.setPos(cpV);
		this.space.addBody(body);

		var shape = new cp.CircleShape(body, radius, cp.v(0,0));
		shape.setElasticity(0);
		shape.setFriction(0.7);
		//shape.group = 1;
		this.space.addShape(shape);

		return body;
	},
	_addChassis_forCar:function (cpV) {
		var space = this.space;

		var mass = 5;
		var width = 80;
		var height = 30;

		var body = new cp.Body(mass, cp.momentForBox(mass, width, height));
		body.setPos(cpV);
		this.space.addBody(body);

		var shape = new cp.BoxShape(body, width, height);
		shape.setElasticity(0);
		shape.setFriction(0.7);
		//shape.group = 1;
		this.space.addShape(shape);

		return body;
	},
	update:function (dt) {
		if(!this.isGameOver)
		{
			// update chipmunk physics
			this.space.step(dt);

			var winSize = cc.Director.getInstance().getWinSize();

			//this.trideroche.resetForces();
			this.trideroche.update(dt);
			// camera to follow trideroche
			this.camPos.x = gmath.lerp(this.camPos.x, this.trideroche.body.getPos().x, GameplaySetting.CAMERA_SPEED);
			this.camPos.y = gmath.lerp(this.camPos.y, this.trideroche.body.getPos().y, GameplaySetting.CAMERA_SPEED);
			// bound camPos
			if(this.camPos.x - winSize.width/2 > 0 && this.camPos.x + winSize.width /2 * this.levelInfo.numScreens < winSize.width * this.levelInfo.numScreens)
				this.setPositionX(-this.camPos.x + winSize.width/2);
			this.setPositionY(-this.camPos.y + winSize.height/1.6);

			// update position of timerecord label
			this.timeRecordLabel.setPosition(cc.p(this.trideroche.head.getPos().x, 
				this.trideroche.head.getPos().y + 30));

			// update goat
			this._goatSprite.update();
			// check for goats to be fell down the platform (that's our task)
			if(this._goatSprite.getPositionY() <= -200)
			{
				this._goatSprite.destroy();
				this._goatSprite = null;	// null it out, so we won't twice destroy it

				// delay a bit then start a next game
				profile.cleared[profile.selectedLevel-1] = 1;
				profile.recordTimes[profile.selectedLevel-1] = this.timeRecord;

				profile.selectedLevel++;

				// win!
				this.isGameOver = true;
				// add cleared layer on-top
				this.addChild(ClearedLayer.create(this.timeRecordLabel.getString()));
			}

			// check for game over (game over condition)
			if(this.trideroche.head.getPos().y <= -1000)
			{
				this.isGameOver = true;

				// delay a bit then restart the game
				this.runAction(cc.Sequence.create(
					cc.DelayTime.create(0.5),
					cc.CallFunc.create(this.restartGame, this))
				);
			}
		}
	},
	// -- keyboard
	onKeyUp:function (e) {
		if(!this.isGameOver)
		{
			this.trideroche.onKeyUp(e);
		}
	},
	onKeyDown:function (e) {
		if(!this.isGameOver)
		{
			// restart game
			if(e == cc.KEY.r)
			{
				this.restartGame();
			}

			// update trideroche key control
			this.trideroche.onKeyDown(e);
		}
	},
	// -- mouse
	onMouseEntered:function (e) {
		return true;
	},
	onMouseMoved:function (e) {
		return true;
	},
	onMouseDragged:function (e) {
		return true;
	},
	onMouseDown: function (e) {
		return true;
	},
	onEnter:function () {
		this._super();
	},
	onExit:function () {
		global.unloadSpriteFrames(res_humanSpriteSheetPlist);

		this._super();
	},
	restartGame:function () {
		// reset states
		this.isGameOver = false;

		this.timeRecord = 0;

		// unschedule
		this.unscheduleUpdate();
		this.unschedule(this._maintainTriderocheHead);
		this.unschedule(this._updateTimeRecord);

		// remove all objects here
		for(var i=0; i<this._groundShapes.length; i++)
			this.space.removeStaticShape(this._groundShapes[i]);
		this._groundShapes = [];
		// destroy trideroche
		this.trideroche.destroy();

		// remove all sprite nodes
		this.removeAllChildren(true);
		// remove sprite from the scene and release physics related objects (if goat is still alive)
		if(this._goatSprite != null)
			this._goatSprite.destroy();

		// re-init
		this.initWithLevel(cc.c4b(0,0,0,0), profile.selectedLevel);
	},
	_maintainTriderocheHead:function (dt) {
		// not apply the force anymore if it will be dies at the ends
		if(this.trideroche.head.getPos().y > -100)
			this.trideroche.maintainHead();
	},
	_updateTimeRecord:function (dt) {
		if(!this.isGameOver)
		{
			// update time record
			this.timeRecord += dt;

			this.timeRecordLabel.setString(this._toTimeFormat(Math.round(this.timeRecord)));
		}
	},
	_toTimeFormat:function (totalSecs) {
		var minutes = Math.floor(totalSecs / 60);
		var secs = totalSecs % 60;

		var strMinutes = minutes + "";
		var strSecs = secs + "";

		if(minutes < 10)
			strMinutes = "0" + minutes;
		if(secs < 10)
			strSecs = "0" + secs;

		return strMinutes +  ":" + strSecs;
	}
});

var GameplayScene = cc.Scene.extend({
	onEnter:function() {
		this._super();

		var layer = new GameplayLayer();
        layer.initWithLevel(cc.c4b(0,0,0,0), profile.selectedLevel);	// use the global setting to generate map from selected level
        this.addChild(layer);
	}
});