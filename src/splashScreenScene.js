var SplashScreenLayer = cc.LayerColor.extend({
	init:function(color) {
		if(!this._super(color))
		{
			global.log("SplashScreenLayer's init() called failed.");
			return false;
		}

		var winSize = cc.Director.getInstance().getWinSize();

		var logo = cc.Sprite.create(res_splashLogo);
		logo.setPosition(cc.p(winSize.width/2 + 5, winSize.height/2));
		this.addChild(logo);

		var label = cc.LabelTTF.create("Indie Game Studio", "AtariClassic", 16);
		label.setPosition(cc.p(winSize.width/2 - label.getContentSize().width/2, winSize.height/4.5));
		this.addChild(label);

		this.runAction(cc.Sequence.create(
			cc.DelayTime.create(1.0),
			cc.CallFunc.create(this._transitionToMainMenuScene, this)));

		return true;
	},
	_transitionToMainMenuScene:function () {
		// add mainmenu scene later ...
		cc.Director.getInstance().replaceScene(cc.TransitionFade.create(1.0, new MainMenuScene()));
	}
});

var SplashScreenScene = cc.Scene.extend({
	onEnter:function() {
		this._super();

		var layer = new SplashScreenLayer();
        layer.init(cc.c4b(0,0,0,0));
        this.addChild(layer);
	}
});