
function getWindowModeEntries(){
    var options = [];
    if(top){
        if(top.miniPlayerActive){
            options.push({name: Lang.RESTORE+' (ESC)', logo:'fa-window-restore', type: 'option', callback: function (){
                top.leaveMiniPlayer();
                refreshListing()
            }})
        } else if(top.isFullScreen()){
            options.push({name: Lang.RESTORE+' (ESC)', logo:'fa-window-restore', type: 'option', callback: function (){
                top.setFullScreen(false);
                refreshListing()
            }})
        } else {
            options.push({name: Lang.FULLSCREEN+' (F11)', logo:'fa-window-maximize', type: 'option', callback: function (){
                top.setFullScreen(true);
                refreshListing()
            }})
            options.push({name: 'Miniplayer (Ctrl+M)', logo:'fa-level-down-alt', type: 'option', callback: function (){
                top.enterMiniPlayer();
                refreshListing()
            }})
            options.push({name: Lang.DUPLICATE+' (Ctrl+Alt+D)', logo:'fa-copy', type: 'option', callback: function (){
                top.spawnOut();
                refreshListing()
            }})
        }
        options.push({name: 'Aspect Ratio (F4)', logo:'fa-arrows-alt', type: 'option', callback: function (){
            top.changeScaleMode()
        }})    
        options.push({name: Lang.START_IN_FULLSCREEN, type: 'check', check: function (checked){
            Config.set('start-in-fullscreen', checked)
        }, checked: () => {
                return Config.get('start-in-fullscreen')
            }
        })
        options.push({name: Lang.GPU_RENDERING, type: 'check', check: function (checked){
            notify(Lang.SHOULD_RESTART, 'fa-cogs', 'normal');
            Config.set('gpu-rendering', checked);
            top.setHardwareAcceleration(checked)
        }, checked: () => {
                return Config.get('gpu-rendering')
            }
        })
    }
    /*
    options.push({name: 'Chromecast', logo:'fa-chrome', type: 'option', callback: function (){
        top.castManagerInit();
        refreshListing()
    }})
    */
    return options;
}

function getHistoryEntries(){
    var options = History.get();
    console.log('HISTORY', options);
    if(options.length){
        options.push({name: Lang.CLEAR, logo:'fa-user-secret', type: 'option', callback: function (){
            History.clear();
            refreshListing()
        }})
    } else {
        options.push({name: Lang.EMPTY, logo:'fa-file', type: 'option'})
    }
    return options;
}

function getRemoteXtras(url, name){
    var url = 'http://app.megacubo.net/stats/data/xtras.'+getLocale(true)+'.json', name = Lang.EXTRAS;
    fetchAndRenderEntries(url, name)
}

function getRemoteSources(callback){
    var url = 'http://app.megacubo.net/stats/data/sources.'+getLocale(true)+'.json', name = Lang.ALL_LISTS;
    return fetchEntries(url, (entries) => {
        callback(entries)
    })
}

function loadSource(url, name, callback, filter){
    var path = assumePath(name);
    var container = getListContainer(true);
    backEntryRender(container, dirname(path));
    var failed = () => {
        notify(Lang.DATA_FETCHING_FAILURE, 'fa-warning', 'normal');
        triggerBack()
    }
    setTimeout(() => { // avoid mess the loading entry returned, getting overridden by him
        ListMan.deepParse(url, (parsed) => {
            if(parsed.length){
                console.log(parsed);
                if(typeof(filter)=='function'){
                    parsed = parsed.map(filter)
                }
                if(path.indexOf(Lang.ALL_LISTS) != -1){
                    if(getSourcesURLs().indexOf(url)==-1){
                        parsed.unshift({
                            type: 'option',
                            logo: 'fa-download',
                            name: Lang.ADD_TO.format(Lang.MY_LISTS),
                            callback: () => {
                                registerSource(url, name, false)
                            }
                        })
                    } else {
                        parsed.unshift({
                            type: 'disabled',
                            logo: 'fa-download',
                            name: Lang.LIST_ALREADY_ADDED
                        })
                    }
                }
                jQuery('.entry:not(.entry-back)').remove();
                index = writeIndexPathEntries(path, parsed, index);
                if(listingPath == path){ // user is at same view
                    listEntriesByPath(path);
                    if(typeof(callback)=='function'){
                        callback(parsed)
                    }
                }
            } else {
                failed()
            }
        })
    }, loadingToActionDelay);
    return [getLoadingEntry()];
}

function getWhatToWatch(){
    var entries = [
        {name: Lang.BOOKMARKS, logo:'fa-star', type: 'group', renderer: getBookmarksEntries, entries: []},
        {name: Lang.MY_LISTS, label: Lang.IPTV_LISTS, logo:'fa-list', type: 'group', entries: [], renderer: getListsEntries},
        {name: Lang.BEEN_WATCHED, logo: 'fa-users', label: onlineUsersCount, type: 'group', renderer: getWatchingEntries, entries: []}
    ];
    if(buildenSharedListsSearchIndex){
        entries = entries.concat([
            {name: Lang.SEARCH, label: '', logo: 'fa-search', type: 'option', callback: () => {setupSearch(null, 'live', Lang.SEARCH)}},
            {name: Lang.MAGNET_SEARCH, label: '', logo: 'fa-magnet', type: 'option', callback: () => {setupSearch(null, 'magnet', Lang.MAGNET_SEARCH)}},
            {name: Lang.CATEGORIES+' &middot; '+Lang.CHANNELS, label: Lang.CHANNELS, logo: 'assets/icons/white/tv.png', type: 'group', entries: [], renderer: () => { return sharedGroupsAsEntries('live'); }},
            {name: Lang.CATEGORIES+' &middot; '+Lang.VIDEOS, label: Lang.VIDEOS, logo: 'fa-film', type: 'group', entries: [], renderer: () => { return sharedGroupsAsEntries('video') }}
        ]);
    } else {
        buildSharedListsSearchIndex(() => {            
            if(listingPath == Lang.WHAT_TO_WATCH){
                refreshListing()
            }
        });
        entries = entries.concat([getLoadingEntry(Lang.GENERATING_INDEX+'...')]);
    }
    entries = entries.concat([
        {name: Lang.RECORDINGS, logo:'fa-download', type: 'group', renderer: getRecordingEntries, entries: []},
        {name: Lang.HISTORY+' (Ctrl+H)', logo:'fa-history', type: 'group', renderer: getHistoryEntries, entries: []},
        {name: Lang.EXTRAS, logo:'fa-folder', type: 'group', renderer: getRemoteXtras, entries: []}
    ]);
    return entries;
}

function renderRemoteSources(){
    var failed = () => {
        notify(Lang.DATA_FETCHING_FAILURE, 'fa-warning', 'normal');
        triggerBack()
    }
    setTimeout(() => {
        getRemoteSources((entries) => {
            var sources = getSourcesURLs();
            console.log('RENTRIES', entries);
            if(entries.length){
                entries = entries.filter((entry) => {
                    return (sources.indexOf(entry.url) == -1)
                });
                entries = entries.map((entry) => {
                    if(!entry.name){
                        entry.name = getNameFromSourceURL(entry.url)
                    }
                    entry.type = "group";
                    if(!entry.label){
                        entry.label = '';
                    }
                    entry.label = entry.label.format(Lang.USER, Lang.USERS);
                    entry.renderer = (data) => {
                        return loadSource(data.url, data.name)
                    }
                    return entry;
                });
                index = writeIndexPathEntries(listingPath, entries);
                listEntriesByPath(listingPath);
                setTimeout(markActiveSource, 250) // wait rendering
            } else {
                failed()
            }
        })
    }, 150);
    return [getLoadingEntry()];
}

function getWatchingEntries(){
    var name = Lang.BEEN_WATCHED;
    return fetchAndRenderWatchingEntries(name)
}

function getWatchingData(cb, update){
    var ckey = 'watching-data';
    data = Store.get(ckey);
    if(!jQuery.isArray(data)){
        data = [];
    }
    if(update || !data.length){
        var url = 'http://app.megacubo.net/stats/data/watching.'+getLocale(true)+'.json';
        fetchEntries(url, (entries) => {
            if(!jQuery.isArray(entries)){
                entries = [];
            } else {
                entries = entries.map((entry) => {
                    entry.label = entry.label.format(Lang.USER, Lang.USERS);
                    return entry;
                })
            }
            if(entries.length){
                Store.set(ckey, entries, 30 * (24 * 3600))
            }
            if(typeof(cb)=='function'){
                cb(entries)
            }
        })
    } else {
        if(typeof(cb)=='function'){
            cb(data)
        }
    }
    return data;
}

function orderEntriesByWatching(entries){
    var data = getWatchingData();
    for(var j=0; j<data.length; j++){
        var n = data[j].label.indexOf(' ');
        if(n){
            n = parseInt(data[j].label.substr(0, n))
        } else {
            n = 0;
        }
        for(var i=0; i<entries.length; i++){
            if(data[j].url == entries[i].url){
                entries[i].watching = n;
                if(n && entries[i].label.indexOf(n+' ')==-1){
                    entries[i].label += ' &middot; '+ n + ' ' + (n > 1 ? Lang.USERS : Lang.USER);
                }
            }
        }
    }
    return entries.slice(0).sort((a, b) => {
        var na = (typeof(a.watching)!='undefined') ? a.watching : 0;
        var nb = (typeof(b.watching)!='undefined') ? b.watching : 0;
        if (na > nb)
          return -1;
        if (na < nb)
          return 1;
        return 0;
    });
}

function preInjectClean(prepend){
    for(var i in index){
        if(index[i].prependName == prepend){
            index.splice(i, 1)
        }
    }
}

function posInjectClean(){
    for(var i=0; i<index.length; i++){
        if(!index[i].prependName && index[i].type == 'stream'){
            index.splice(i, 1);
            i = 0; // restart loop
        }
    }
}

function injectContinueOption(){
    var lastEntry, prepend = Lang.CONTINUE+': ';
    var c = currentStream(), playingName = c ? c.name : false;
    var start = (c || Config.get('resume')) ? 1 : 0;
    preInjectClean(prepend);
    for(var i=start; i < 3; i++){
        lastEntry = History.get(i);
        if(lastEntry && lastEntry.name != playingName){
            lastEntry.prependName = String(prepend);
            lastEntry.label = basename(lastEntry.group || '');
            index.unshift(lastEntry);
            break;
        }
    }
    posInjectClean();
    if(!listingPath){
        refreshListing()
    }
}

function injectFeaturedOption(entry){
    var lastEntry, prepend = Lang.FEATURED+': ';
    var c = currentStream(), playingName = c ? c.name : false;
    var start = (c || Config.get('resume')) ? 1 : 0;
    entry.prependName = prepend;
    preInjectClean(prepend);
    entry.label = entry.label.format(Lang.USER, Lang.USERS);
    index.unshift(entry);
    posInjectClean();
    if(!listingPath){
        refreshListing()
    }
}

top.PlaybackManager.on('commit', injectContinueOption);
top.PlaybackManager.on('stop', injectContinueOption);

jQuery(document).on('lngload', () => {
    injectContinueOption();
    getWatchingData((entries) => {
        var entry = false;
        for(var i=0; i<entries.length; i++){
            if(isLive(entries[i].url)){
                entry = Object.assign({}, entries[i]);
                break;
            }
        }
        if(entry){
            var go = (iconExists) => {
                if(!iconExists){
                    entry.logo = 'fa-fire';
                }
                console.log('GOING', index[0], index[0].type, index[0].name, entry.name, index[0].prependName, Lang.FEATURED+': ');
                injectFeaturedOption(entry)
            }
            if(entry.logo && entry.logo.substr(0, 3)!='fa-'){
                var m = new Image();
                m.onload = () => {
                    go(true)
                }
                m.onerror = () => {
                    go(false)
                }
                m.src = entry.logo;
            } else {
                go(false)
            }
        }
    }, true)
});

function getSearchRangeEntries(){
    var options = [];
    var callback = (entry, r) => {
        Config.set('search-range', entry.value);
        console.log('RANGER', entry, entry.value);
        top.location.reload()
    }
    options.push({name: Lang.LOW+' ('+Lang.LISTS+': 18)', value: 18, logo:'fa-search-minus', type: 'option', renderer: getRecordingEntries, callback: callback});
    options.push({name: Lang.MEDIUM+' ('+Lang.LISTS+': 36)', value: 36, logo:'fa-search', type: 'option', renderer: getRecordingEntries, callback: callback});
    options.push({name: Lang.HIGH+' ('+Lang.LISTS+': 64)', value: 64, logo:'fa-search-plus', type: 'option', renderer: getRecordingEntries, callback: callback});
    options.push({name: Lang.XTREME+' ('+Lang.LISTS+': 96, '+Lang.SLOW+')', value: 96, logo:'fa-search-plus', type: 'option', renderer: getRecordingEntries, callback: callback});
    return options;
}

function getParentalControlEntries(){
    var options = [
        {
            name: Lang.HIDE_LOGOS,
            type: 'check',
            check: (checked) => {
                Config.set('hide-logos', checked);
                showLogos = !checked;
            }, 
            checked: () => {
                return Config.get('hide-logos')
            }
        },
        {
            name: Lang.HIDE_ADULT_CONTENT,
            type: 'check',
            check: (checked) => {
                Config.set('show-adult-content', !checked);
                showAdultContent = !checked;
            }, 
            checked: () => {
                return !Config.get('show-adult-content')
            }
        },
        {
            type: 'input',
            logo: 'assets/icons/white/shield.png',
            change: function (entry, element, val){
                Config.set('parental-control-terms', val)
            },
            value: userParentalControlTerms().join(','),
            placeholder: Lang.FILTER_WORDS
        }
    ];
    return options;
}

function getBookmarksEntries(reportEmpty){
    var options = [], stream;
    var bookmarks = Bookmarks.get();
    if(stream = currentStream()){
        if(!Bookmarks.is(stream)){
            options.push({name: Lang.ADD+': '+stream.name, logo:'fa-star', type: 'option', callback: function (){
                addFav(stream);
                refreshListing()
            }})
        }
    }
    if(bookmarks && bookmarks.length){
        options = options.concat(bookmarks);
        options.push({name: Lang.REMOVE, logo: 'fa-trash', type: 'group', renderer: getBookmarksForRemoval})
    } else if(reportEmpty) {
        options.push({name: Lang.EMPTY, logo:'fa-file', type: 'option'})
    }
    return options;
}

function getBookmarksForRemoval(){
    var bookmarks = Bookmarks.get();
    var entries = [];
    if(bookmarks.length){
        for(var i in bookmarks){
            entries.push({
                name: Lang.REMOVE.toUpperCase()+': '+bookmarks[i].name, 
                logo:'assets/icons/white/trash.png', 
                type: 'option',
                stream: bookmarks[i], 
                callback: function (data){
                    removeFav(data.stream);
                    triggerBack()
                }
            })
        }
    } else {
        entries.push({name: Lang.EMPTY, logo:'fa-file', type: 'option'})
    }
    return entries;
}

function getRecordingEntries(){
    var options = [];
    if(top.isRecording){
        options.push({name: Lang.STOP_RECORDING+' (F9)', logo:'fa-stop', type: 'option', callback: function (){
            top.stopRecording();
            refreshListing()
        }});
    } else {
        options.push({name: Lang.START_RECORDING+' (F9)', logo:'fa-download', type: 'option', callback: function (){
            top.startRecording();
            wait(function (){
                return top.isRecording;
            }, function (){
                refreshListing()
            })
        }});
    }
    Recordings.sync(); // clean deleted ones
    var history = Recordings.get();
    if(history && history.length){
        options = options.concat(history);
        options.push({name: Lang.CLEAR, logo:'fa-user-secret', type: 'option', callback: function (){
            Recordings.clear();
            refreshListing()
        }});
    }
    return options;
}

function getLanguageEntries(){
    var options = [];
    fs.readdirSync('lang').forEach(file => {
        if(file.indexOf('.json')!=-1){
            console.log(file);
            var locale = file.split('.')[0];
            options.push({
                name: languageLabelMask.format(locale.toUpperCase()),
                logo: 'fa-language',
                type: 'option',
                callback: function (data){
                    var resetActiveList = (getActiveSource() == communityList());
                    Config.set('locale', locale);
                    if(resetActiveList){
                        setActiveSource(communityList())
                    }
                    markActiveLocale();
                    setTimeout(function (){
                        top.location.reload()
                    }, 1000)
                }
            })
        }
    })
    return options;
}

function getListsEntries(notActive, noManagement){
    var sources = getSources(), active = getActiveSource();
    var options = [];
    for(var i in sources){
        var entry = sources[i], length = '-', groups = '-';
        if(!jQuery.isArray(entry)) continue;
        if(notActive === true && entry[1] == active) continue;
        if(typeof(entry[2])=='object'){
            var locale = getLocale(false, true);
            length = Number(entry[2].length).toLocaleString(locale);
            groups = Number(entry[2]['groups']).toLocaleString(locale);
        }
        options.push({
            name: entry[0], 
            logo: 'fa-shopping-bag', 
            type: 'group', 
            url: entry[1], 
            label: Lang.STREAMS+': '+length, 
            renderer: (data) => {
                return loadSource(data.url, data.name)
            },
            delete: (data) => {
                unRegisterSource(data.url);
                markActiveSource();  
                refreshListing()          
            }, 
            rename: (name, data) => {
                //alert(newName)         
                setSourceName(data.url, name)
            }
        })
    }
    if(noManagement !== true){
        options.push({name: Lang.ADD_NEW_LIST, logo: 'fa-plus', type: 'option', callback: addNewSource});
        options.push({name: Lang.REMOVE_LIST, logo: 'fa-trash', type: 'group', renderer: getListsEntriesForRemoval, callback: markActiveSource});
        options.push({name: Lang.ALL_LISTS, logo: 'fa-users', type: 'group', renderer: renderRemoteSources, entries: []});
        options.push({name: Lang.SHARE_LISTS, type: 'check', check: function (checked){
            Config.set('unshare-lists', !checked)
        },  checked: () => {
                return !Config.get('unshare-lists')
            }
        });
        options.push({name: Lang.HD_LISTS, logo: 'fa-cart-arrow-down', type: 'option', callback: () => {
            var url = Config.get('hd-lists-url');
            if(url){
                gui.Shell.openExternal(url)
            }
        }})
    } else {
        options.push({name: Lang.ALL_LISTS, logo: 'fa-users', type: 'group', renderer: renderRemoteSources, entries: []})
    }
    return options;
}

function getListsEntriesForRemoval(){
    var sources = getSources();
    var entries = [];
    if(sources.length){
        for(var i in sources){
            entries.push({
                name: Lang.REMOVE.toUpperCase()+': '+sources[i][0], 
                logo:'assets/icons/white/trash.png', 
                type: 'option', 
                url: sources[i][1], 
                callback: function (data){
                    unRegisterSource(data.url); 
                    listEntriesByPath(dirname(data.path));
                    setTimeout(function (){
                        refreshListing()
                    }, 1000)
                }, 
                path: Lang.LISTS
            })
        }
    } else {
        entries.push({name: Lang.EMPTY, logo:'fa-file', type: 'option'})
    }
    return entries;
}


