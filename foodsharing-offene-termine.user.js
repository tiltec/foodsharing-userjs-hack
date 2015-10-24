// ==UserScript==
// @name        foodsharing-offene-termine
// @namespace   fdg
// @include     https://foodsharing.de/?page=dashboard*
// @version     1
// @grant       none
// ==/UserScript==

function getQueryVariable(query, variable) {
  var vars = query.split("&");
  for (var i=0;i<vars.length;i++) {
    var pair = vars[i].split("=");
    if (pair[0] == variable) {
      return pair[1];
    }
  } 
  alert('Query Variable ' + variable + ' not found');
}

function UnsafeHTMLParser(aHTMLString){
    var html = document.implementation.createHTMLDocument("geizhals-dom");
    html.documentElement.innerHTML = aHTMLString;
    return html;
}


function update_page(results){
	target = $('div[name=insert_here]');
    target.first().empty();
    results.sort(function (a,b) { return a.timestamp-b.timestamp });
    // create Date subfolders
	dates = {};
	for(var i = 0; i<results.length; i++) {
		d = results[i].date;
		if (!dates[d]) {
			date_content = $("<div style='display:none'></div>");
			if (i == 0) {
				date_content = $("<div></div>");
			}
			date_el = $("<div><a href='#'><div class='head ui-widget-header ui-corner-top'>"+d+"</div></a></div>");
			date_el[0].firstChild.addEventListener('click', function (ev){
					ev.preventDefault();
					el = this.nextSibling;
					if (el.style.display != "none") {
						el.style.display = "none";
					} else {
						el.style.display = "";
					}
				});
			date_content.appendTo(date_el);
			date_el.appendTo(target);
			dates[d] = date_content;
		}
	}
	// insert dates
    for(var i = 0; i<results.length && i < 1000; i++) {
		let item = results[i];
		d = item.date;
		
        let click_el = $("<a href='"+item.url+"'></a>").append(item.dom);
        dates[d].append(click_el);
        
        let onurl = "xhr.php?f=addFetcher&date="+item.fetchdate+"&bid="+item.bid+"&from=&to=";
        let offurl = "xhr.php?f=delDate&date="+item.fetchdate+"&bid="+item.bid;
		$("li > a", click_el).click(function(el) {
			if (!item.subscribed) {
				if (confirm("are you sure to sign up?\n"+item.bname+"\n"+item.fetchdate+"\n"+onurl)) {
					$.get(onurl, function(data) {
						alert("subscribed!");					
						item.subscribed = true;
					});
				}
			} else {
				if (confirm("remove date?\n"+item.bname+"\n"+item.fetchdate+"\n"+offurl)) {
					$.get(offurl, function(data) {
						alert("removed");
						item.subscribed = false;
					});
				}
			}
		});
        
    }    
}

global_result = [];
betriebe1 = [];

$('#right > div:nth-child(1)').prepend(
'<div class="field"><a href="#" id="start_scraping"><div class="head ui-widget-header ui-corner-top">Offene Abholtermine</div></a><div class="ui-widget ui-widget-content corner-bottom margin-bottom ui-padding"><div style="position: relative; overflow: hidden; width: auto;" class="slimScrollDiv"><div style="overflow: hidden; width: auto;" id="scroller" class="scroller" name="insert_here"></div><div style="background: rgb(74, 53, 32) none repeat scroll 0% 0%; width: 7px; position: absolute; top: 0px; border-radius: 7px; z-index: 11; right: 1px; height: 35.251px; display: none; opacity: 0.8;" class="slimScrollBar"></div><div style="width: 7px; height: 100%; position: absolute; top: 0px; display: none; border-radius: 7px; background: rgb(51, 51, 51) none repeat scroll 0% 0%; opacity: 0.2; z-index: 10; right: 1px;" class="slimScrollRail"></div></div></div></div>'
);
$('#start_scraping')[0].addEventListener('click', function(ev) {
ev.preventDefault();

var betriebe = $(".jmenu-foodsaver > ul:nth-child(2) > li > a");
for (var i = 0; i < betriebe.length; i++) {
    betriebe1[getQueryVariable(betriebe[i].href, "id")] = betriebe[i].innerHTML;
}

for (var i = 0; i < betriebe1.length; i++) {
    if(betriebe1[i]==undefined) {
        continue;
    }
	var oreq = new XMLHttpRequest();
	var url = "https://foodsharing.de/?page=fsbetrieb&id="+String(i);
	oreq.open('get', url, true);
	oreq.onreadystatechange = function(bname, url, i){
		return function(){
		if(this.readyState == 4){
			if(this.status == 200){
				var html = UnsafeHTMLParser(this.responseText);
				var fetch = $("div[id^=fetch][id$=wrapper]", html);
				var fetch_self = fetch.has('[onclick*=u_undate]');
				var fetch_filled = fetch.has('li[class*= fetch-]');
				var fetch_halfempty = fetch.has("li.empty").not(fetch_self); // empty and half empty ones excluding myself
				var fetch_empty = fetch_halfempty.not(fetch_filled);
				var fetch_select = $.merge($.merge([], fetch_halfempty), fetch_self);
				for(var j=0; j<fetch_select.length; j++) {
					item = {};
					item.dom = fetch_select[j];
					item.bname = bname;
					item.timestamp = parseInt(fetch_select[j].id.split('-')[1]);
					item.date = $('label', fetch_select[j])[0].innerHTML.split(',')[0];
					item.url = url;
					item.bid = i;
					item.subscribed = ($(fetch_select[j]).has('[onclick*=u_undate]').length != 0);
					item.fetchdate = $('input', fetch_select[j]).val().replace(" ", "+");
					$('label', item.dom).append('<br>'+bname);
					global_result.push(item);
				}
				update_page(global_result);
			}
			else{
				console.log(this.statusText);
			}
		}
	}}(betriebe1[i], url, i); // closure
	oreq.send(null);
}
});