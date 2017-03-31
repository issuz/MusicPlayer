$(function(){

	var song1 = new Music("music1");
	song1.init();

})

/**
 *	构造函数
 */
function Music(id){
	
	this.audio = $("#"+id).find(".audio")[0];
	this.player =  $("#"+id).find(".audio");
	this.channel = $("#"+id).find(".channel");
}
/**
 *	初始化
 */
Music.prototype.init = function(){
	var _this = this;
	_this.getChannel();
	_this.main();
};
/**
 *	获取频道
 */
Music.prototype.getChannel = function(){
	var _this = this;
	$.ajax({
		dataType: 'jsonp',
		url:"http://api.jirengu.com/fm/getChannels.php",
//		dataType:"json",
		Method:"get",
		success:function(res){
			var channels = res.channels;
			var channelNum = Math.floor(Math.random()*channels.length);
			
			var channelName = channels[channelNum].name;
			var channelId = channels[channelNum].channel_id;
			
			for(var i=0;i<channels.length;i++){
				var option = $("<option></option>");
				$(".channelBtn select").append(option);
				option.val(channels[i].name);
				option.text(channels[i].name);
				option.attr("data-channelId",channels[i].channel_id);
				if(i == channelNum){
					option.attr('selected', true);
				}
			}
			 
			_this.channel.text("频道:"+channelName);
			_this.channel.attr("data-channel",channelId);
			
			
			//存储频道信息
			_this.sendStorage("channel_text", channelName);
			_this.sendStorage("channel_id", channelId);
			//获取歌曲
			_this.getMusic(_this.readStorage("channel_id"));	
		}
	});
};

/**
 *	获取歌曲
 */
Music.prototype.getMusic = function(channel){
	var _this = this;
//	console.log(_this.readStorage("channel_id"));
	$.ajax({
		dataType: 'jsonp',
		url:"http://api.jirengu.com/fm/getSong.php",
//		dataType:"json",
		Method:"get",
		data:{
			"channel":channel
		},
		success:function(res){
			var resource = res.song[0];

			var url = resource.url,
				sid = resource.sid,
				pic = resource.picture,
				title = resource.title,
				singer = resource.artist;

			$(".audio").attr({
				"src":url,
				"sid":sid
			});
			$(".musicPic img").attr("src",pic);
			$(".songName").text(title).attr("title",title);
			$(".singer").text(singer).attr("title",singer);

			if($(".playBtn").attr("data-play")=="play"){
				_this.audio.play();
			}else{
				_this.audio.pause();
			}
			//设置歌曲时间
			_this.songTime();
			
			//获取歌词
			_this.getLrc(sid);
			//歌词运动	
//			console.log(curTime);
			
		}
	});
};

/**
 *	获取歌词
 */
Music.prototype.getLrc = function(sid){
	var _this =this;
	$.ajax({
		dataType: 'jsonp',
		url:"http://api.jirengu.com/fm/getLyric.php",
//		dataType:"json",
		Method:"get",
		data:{
			"sid":sid
		},
		success:function(res){
			
			_this.readLrc(res.lyric);
			_this.player.off("timeupdate").on("timeupdate", function() {
				_this.lrcMove();
			});
			
		}

	});
};
/**
 *	解析歌词
 */
Music.prototype.readLrc  = function(lrc){
	var _this = this;
	
	$(".lrc").empty();//清空歌词
	var lrcArr = lrc.split("\n");
	console.log(lrcArr);
	
	var reg1 = /\[\d\d\:\d\d(\.|\:)\d\d\]/g, //去掉时间[00:00.01]
		reg2 = /\[\w+\:/g,					 //去掉[ti:]
		reg3 = /\]/g,
		reg4 = /(by)\s\S+/g;				//去掉by 饥人谷
	
	var mm,
		ss,
		ms;
	
	var ul = $("<ul></ul>");
	//	var reg = /\[\d\d\:\d\d(\.|\:)\d\d\]/g;
		
	for(var i=0;i<lrcArr.length;i++){
		mm = parseInt(lrcArr[i].slice(1,3));
		ss = parseInt(lrcArr[i].slice(4,6));
		ms = parseInt(lrcArr[i].slice(7));
		
		var time = mm * 60 + ss ;
		
		
		if(isNaN(mm)){
			continue;
		}
		lrcArr[i] = lrcArr[i].replace(reg1,"");
		lrcArr[i] = lrcArr[i].replace(reg2,"");
		lrcArr[i] = lrcArr[i].replace(reg3,"");
		lrcArr[i] = lrcArr[i].replace(reg4,"by Z");
		
		var li = $('<li data-time="'+time+'">'+lrcArr[i]+'</li>');
		ul.append(li);
		
	}
	$(".lrc").append(ul)
	
};
/**
 *	歌词运动
 */
Music.prototype.lrcMove = function(){
	var _this = this;
	var curTime = _this.audio.currentTime;
	var height = $(".lrc ul li").height();
	var liLen = $(".lrc ul li").length;
	
	$(".lrc ul li").each(function(){
		if(parseInt(curTime) == $(this).attr("data-time")){
			var index = $(this).index();
			
			$(this).addClass("active").siblings().removeClass("active");
			
			if(index>6 && index<(liLen-6)){
				$(this).parent().animate({
					marginTop: -height*(index-6)
				});
			}
			
			
		}
		
	});
};
/**
 *	主函数
 */
Music.prototype.main = function(){
	
	var _this = this;
	_this.audio.volume = 0.5; //默认音量
	
	//一首歌播放完,同一频道的下一首
	$(".audio").on("ended", function () {
		_this.getMusic(_this.readStorage("channel_id"));
	});
	//暂停,播放
	$(".playBtn").on("click",function(){
		if($(this).attr("data-play")=="play"){
			$(this).attr("data-play","pause");
			$(this).css("backgroundImage","url(images/play.png)");
			_this.audio.pause();
		}else{
			$(this).attr("data-play","play");
			$(this).css("backgroundImage","url(images/pause.png)");
			_this.audio.play();
		}

	});
	//同一频道,下一首
	$(".nextBtn").on("click",function(){
		_this.getMusic(_this.readStorage("channel_id"));
	});
	//换频道
	$(".channelBtn").on("change",function(){
		var channelName = $(".channelBtn select").find("option:selected").val();
		var channelId = $(".channelBtn select").find("option:selected").attr("data-channelId");
		_this.sendStorage("channel_text", channelName);
		_this.sendStorage("channel_id", channelId);
		
		_this.channel.text("频道:"+channelName);
		_this.channel.attr("data-channel",channelId);
		
		_this.getMusic(_this.readStorage("channel_id"));
		
	});
	//歌曲快进,后退
	$(".processAll").on("click",function(ev){
		var ev = ev || window.event;

		_this.playedAdjust(ev);
	});
	$(".processNow").on("click",function(ev){
		var ev = ev || window.event;

		_this.playedAdjust(ev);
	});
	//音量调节
	$(".volumeAll").on("click",function(ev){
		$(".volumeBtn").removeClass("silent");
		var ev = ev || window.event;
		
		_this.volumeChange(ev);
	});
	$(".volumeNow").on("click",function(ev){
		$(".volumeBtn").removeClass("silent");
		var ev = ev || window.event;
		
		_this.volumeChange(ev);
	});
	//静音
	$(".volumeBtn").on("click",function(){
		$(this).toggleClass("silent");
		
		if($(this).hasClass("silent")){
			_this.volumeNo();
			
		}else{
			var volume = _this.readStorage("volume");
			$(".volumeText span").text(Math.floor(volume*100)).css("marginLeft","-7px");
			$(".volumeText").css("left",volume*100+"%");
			$(".volumeNow").css("width",volume*100+"%");
			_this.audio.volume = volume	//音量调节
		}
	});
	//显示歌词
	$(".lrcBtn").on("click",function(){
		$(".lrcBox").fadeIn();
	});
	//关闭歌词
	$(".lrcClose").on("click",function(){
		$(".lrcBox").fadeOut();
	});
};
/**
 *	调整进度条
 */
Music.prototype.playedAdjust = function(ev){
	var _this =this;
	var processW = $(".processAll").width();
	var offsetLeft = $(".processAll").offset().left;

	var left = ev.clientX - offsetLeft;
	var curPer = left/processW;
	_this.timeChange(curPer);
	$(".processNow").css("width",curPer* 100+"%");
};
/**
 *	改变歌曲当前播放时间
 */
Music.prototype.timeChange = function(per){
	var _this = this;
	_this.audio.currentTime = per * _this.audio.duration;
};
/**
 *	歌曲时长
 */
Music.prototype.songTime = function(){
	var _this = this;
	$(".allTime").text("00:00");
	$(".curTime").text("00:00");
	setInterval(function(){
		var lineW = $(".processAll").width();
		var per = _this.audio.currentTime / _this.audio.duration * 100;
		$(".processNow").css("width",per+"%");

		var curTime = timeFormat(_this.audio.currentTime); 
		var allTime = timeFormat(_this.audio.duration); 

		$(".allTime").text(allTime);
		$(".curTime").text(curTime);

	},1000);

};
//时间格式化
function timeFormat(sec){
	var minutes = parseInt(sec / 60);
	var seconds = parseInt(sec % 60);
	minutes =  minutes<10?"0"+minutes:minutes;
	seconds = seconds<10?"0"+seconds:seconds;
	return minutes+":"+seconds;
}
/**
 *	调整音量条
 */
Music.prototype.volumeChange = function(ev){
	var _this = this;
	var volumeW = $(".volumeAll").width();
	var offsetLeft = $(".volumeAll").offset().left;
	var left = ev.clientX - offsetLeft;
	
	var curPer = left / volumeW ;
	$(".volumeNow").css("width",curPer*100+"%");
	
	var textNum = Math.floor(curPer*100);
	$(".volumeText span").text(textNum);
	$(".volumeText").css("left",curPer*100+"%");
	
	if(textNum<10){
		$(".volumeText span").css("marginLeft","0");
	}else{
		$(".volumeText span").css("marginLeft","-7px");
	}
	
	_this.audio.volume = curPer;	//音量调节
	
	_this.sendStorage("volume",curPer);
};


/**
 *	静音
 */
Music.prototype.volumeNo = function(ev){
	var _this = this;
	$(".volumeText").css("left","0");
	$(".volumeText span").text("0").css("marginLeft","-2px");
	$(".volumeNow").css("width","0");
	
	_this.audio.volume = 0;		//音量调节
};
/**
 *	本地存储
 */
Music.prototype.sendStorage = function(key, value) {
	localStorage.setItem(key, value);
}
/**
 *	读取存储
 */
Music.prototype.readStorage = function(key) {
	return localStorage.getItem(key);
}
