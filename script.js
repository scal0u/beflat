// Code goes here

var app = angular.module('myApp', ["firebase", "ngRoute"]);

app.config(['$routeProvider', function($routeProvider) {
    $routeProvider
    .when('/', {
        templateUrl: 'views/home.html',
        controller: 'homeController'
    })
    .when('/events/', {
        templateUrl: 'views/events/index.html',
        controller: 'eventListController'
    })
    .when('/events/new', {
        templateUrl: 'views/events/new.html',
        controller: 'newEventController'
    })
    .when('/events/:eventId', {
        templateUrl: 'views/events/single.html',
        controller: 'singleEventController'
    })
    .when('/events/:eventId/edit', {
        templateUrl: 'views/events/edit.html',
        controller: 'eventEditController'
    })
    .when('/songs/new/:eventId', {
        templateUrl: 'views/songs/new.html',
        controller: 'newSongController'
    })
    .when('/songs/:songId', {
        templateUrl: 'views/songs/single.html',
        controller: 'singleSongController'
    })
    .when('/songs/:songId/edit', {
        templateUrl: 'views/songs/edit.html',
        controller: 'songEditController'
    })
    .when('/events/:eventId/songs', {
        templateUrl: 'views/events/songs.html',
        controller: 'eventSongsController'
    });
}]);

app.directive("topBar", function() {
    return {templateUrl : "views/topbar.html"};
});

app.controller('homeController', function($scope, $firebaseArray) {

    $scope.page = {
        rightBtn: {fa: "bell"},
    };

    var fb = new Firebase("https://beflat.firebaseio.com/");
    $scope.fb = $firebaseArray(fb);

    $scope.group = {
        id: "-KGrBTtHxJyADLwIeJ1l",
        events: [],
    };

    fb.child("/groups/"+$scope.group.id).once('value', function(snap) {
        // Getting group name
        $scope.page.title = snap.val().name;

        $scope.group_events = snap.val().events;

        // Getting group events
        for(group_event in $scope.group_events) {
            fb.child("/events/"+$scope.group_events[group_event].id).once('value', function(snap) {
                var event = snap.val();
                event.id = $scope.group_events[group_event].id;
                event.date = new Date(event.date);
                $scope.group.events.push(event);
            });
        }
    });
    
});

app.controller('eventListController', function($scope, $firebaseArray) {

    $scope.page = {
        title: "Events",
        leftBtn: "prev",
        rightBtn: {fa: "plus", href: "events/new"},
    };

    var fb = new Firebase("https://beflat.firebaseio.com/");
    $scope.fb = $firebaseArray(fb);

    $scope.group = {
        id: "-KGrBTtHxJyADLwIeJ1l",
        events: [],
    };

    fb.child("/groups/"+$scope.group.id).once('value', function(snap) {

        $scope.group_events = snap.val().events;

        // Getting group events
        for(group_event in $scope.group_events) {
            fb.child("/events/"+$scope.group_events[group_event].id).once('value', function(snap) {
                var event = snap.val();
                event.id = $scope.group_events[group_event].id;
                event.date = new Date(event.date);
                $scope.group.events.push(event);
            });
        }
        
    });
    
});

app.controller('singleEventController', function($scope, $firebaseArray, $routeParams) {

    $scope.params = $routeParams;
    $scope.id = $scope.params.eventId;

    $scope.page = {
        leftBtn: {fa: "chevron-left", href: "/"},
        rightBtn: {fa: "edit", href: "events/"+$scope.id+"/edit"},
        title: "Event",
    };

    var fb = new Firebase("https://beflat.firebaseio.com/");
    $scope.fb = $firebaseArray(fb);
    fb.child("/tracks/").once('value', function(snap) {
        $scope.existing_tracks = snap.val();
    });
    fb.child("/events/"+$scope.id).once('value', function(snap) {
        $scope.event = snap.val();
        $scope.event.date = new Date($scope.event.date);
    });

    var event_tracks = new Firebase("https://beflat.firebaseio.com/"+"/events/"+$scope.id+"/tracks");
    $scope.event_tracks = $firebaseArray(event_tracks);

});

app.controller('eventEditController', function($scope, $firebaseObject, $routeParams, $location) {

    $scope.page = {
        leftBtn: {fa: "chevron-left"},
        rightBtn: "submit",
        title: "Edit event",
    };

    $scope.params = $routeParams;
    $scope.id = $scope.params.eventId;

    var fb = new Firebase("https://beflat.firebaseio.com/events/"+$scope.id);
    $scope.event = $firebaseObject(fb);

    fb.once('value', function(snap) {
        $scope.date = new Date(snap.val().date);
    });

    $scope.update = function() {
        $scope.event.date = $scope.date.toString();
        $scope.event.$save();
        $location.path('events/'+$scope.id);
    };

});

app.controller('eventSongsController', function($scope, $firebaseArray, $routeParams, $location) {

    $scope.params = $routeParams;
    $scope.id = $scope.params.eventId;

    $scope.tracks = [];

    var fb = new Firebase("https://beflat.firebaseio.com/");
    $scope.fb = $firebaseArray(fb);

    // Getting current event tracks
    fb.child("/events/"+$scope.id+"/tracks").once('value', function(snap) {
        var event_tracks = snap.val();
        
        // Getting existing tracks
        fb.child("/tracks/").once('value', function(snap) {
            $scope.existing_tracks = snap.val();
            // Removing already picked songs
            for(chanson in event_tracks) {
                if($scope.existing_tracks[event_tracks[chanson]]) {
                    delete $scope.existing_tracks[event_tracks[chanson]];
                }
            }
        });
    });

    $scope.event_tracks = $firebaseArray(fb.child("events/"+$scope.id+"/tracks"));
    $scope.addTrack = function(key) {
        $scope.event_tracks.$add(key);
        $location.path('events/'+$scope.id);
    };

    $scope.page = {
        title: "Pick songs",
        leftBtn: {fa: "chevron-left", href: "events/"+$scope.id},
        rightBtn: {fa: "plus", href: "songs/new/"+$scope.id},
    };

});

app.controller('newEventController', function($scope, $firebaseArray, $location) {

    var fb = new Firebase("https://beflat.firebaseio.com/");
    $scope.fb = $firebaseArray(fb);

    $scope.group = {
        id: "-KGrBTtHxJyADLwIeJ1l",
        events: [],
    };

    $scope.events = $firebaseArray(fb.child("events"));
    $scope.group_events = $firebaseArray(fb.child("groups/"+$scope.group.id+"/events"));

    $scope.page = {
        title: "Add event",
        leftBtn: "prev",
        rightBtn: "submit",
    };

    $scope.event = {
        title: "", 
        type: "rehearsal",
        // date: new Date(),
    };

    $scope.addEvent = function() {
        $scope.event.date = $scope.event.date.toString();
        $scope.events.$add($scope.event).then(function(ref) {
            var id = ref.key();
            console.log("added record with id " + id);
            $scope.group_events.$add({'id': id}).then(function(ref) {
                $location.path('events/');
            });
        });
    };

});

app.controller('newSongController', function($scope, $firebaseArray, $routeParams, $location) {

    $scope.params = $routeParams;
    $scope.id = $scope.params.eventId;

    var fb = new Firebase("https://beflat.firebaseio.com/");
    $scope.fb = $firebaseArray(fb);

    $scope.tracks = $firebaseArray(fb.child("tracks"));

    $scope.page = {
        title: "Add song",
        leftBtn: "prev",
        rightBtn: "submit",
    };

    $scope.song = {
        name: "",
        artist: "",
        notes: "",
        lyrics: "",
        documents: [],
    };

    $scope.addSong = function() {
        $scope.tracks.$add($scope.song);
        $location.path('events/'+$scope.id+'/songs');
    };

});

app.controller('singleSongController', function($scope, $firebaseObject, $routeParams, $sce) {

    $scope.params = $routeParams;
    $scope.id = $scope.params.songId;

    var fb = new Firebase("https://beflat.firebaseio.com/");

    $scope.page = {
        leftBtn: "prev",
        rightBtn: {fa: "edit", href: "songs/"+$scope.id+"/edit"},
    };

    fb.child("/tracks/"+$scope.id).once('value', function(snap) {
        $scope.track = snap.val();
        if($scope.track.lyrics) $scope.lyrics = $sce.trustAsHtml($scope.track.lyrics.replace(/\n/g, "<br/>"));
        $scope.page.title = snap.val().name;
    });

});

app.controller('songEditController', function($scope, $firebaseObject, $routeParams, $location) {

    $scope.params = $routeParams;
    $scope.id = $scope.params.songId;


    $scope.page = {
        leftBtn: "prev",
        rightBtn: "submit",
        title: "Edit song",
    };

    var fb = new Firebase("https://beflat.firebaseio.com/tracks/"+$scope.id);
    $scope.track = $firebaseObject(fb);

    $scope.update = function() {
        $scope.track.$save();
        $location.path('songs/'+$scope.id);
    };

});