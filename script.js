// Code goes here

var app = angular.module('myApp', ["firebase", "ngRoute"]);

app.run(["$rootScope", "$location", function($rootScope, $location) {
    $rootScope.$on("$routeChangeError", function(event, next, previous, error) {
        // We can catch the error thrown when the $requireAuth promise is rejected
        // and redirect the user back to the home page
        if (error === "AUTH_REQUIRED") {
            $location.path("/auth");
        }
    });
}]);

app.config(['$routeProvider', function($routeProvider) {
    var resolve = {"currentAuth": ["Auth", function(Auth) {return Auth.$requireAuth();}]};
    $routeProvider
    .when('/auth/', {
        templateUrl: 'views/auth.html',
        controller: 'authController',
    })
    .when('/', {
        templateUrl: 'views/home.html',
        controller: 'homeController',
        resolve: resolve,
    })
    .when('/group/home', {
        templateUrl: 'views/home.html',
        controller: 'homeController',
        resolve: resolve,
    })
    .when('/events/', {
        templateUrl: 'views/events/index.html',
        controller: 'eventListController',
        resolve: resolve,
    })
    .when('/events/new', {
        templateUrl: 'views/events/new.html',
        controller: 'newEventController',
        resolve: resolve,
    })
    .when('/events/:eventId', {
        templateUrl: 'views/events/single.html',
        controller: 'singleEventController',
        resolve: resolve,
    })
    .when('/events/:eventId/edit', {
        templateUrl: 'views/events/edit.html',
        controller: 'eventEditController',
        resolve: resolve,
    })
    .when('/songs/new/:eventId', {
        templateUrl: 'views/songs/new.html',
        controller: 'newSongController',
        resolve: resolve,
    })
    .when('/songs/:songId', {
        templateUrl: 'views/songs/single.html',
        controller: 'singleSongController',
        resolve: resolve,
    })
    .when('/songs/:songId/edit', {
        templateUrl: 'views/songs/edit.html',
        controller: 'songEditController',
        resolve: resolve,
    })
    .when('/events/:eventId/songs', {
        templateUrl: 'views/events/songs.html',
        controller: 'eventSongsController',
        resolve: resolve,
    })
    .when('/test/', {
        templateUrl: 'views/test.html',
        controller: 'testController',
        resolve: resolve,
    });
}]);

app.directive("topBar", function() {
    return {templateUrl : "views/topbar.html"};
});

app.factory('fb', ["$firebaseArray", function () {
    return new Firebase("https://beflat.firebaseio.com/");
}]);


app.factory('user', ["$firebaseObject", "fb", function ($firebaseObject, fb) {
    return {

        set: function (uid, path, value) {
    
            var edited = $firebaseObject(fb.child("users/"+uid+"/"+path));
            edited.$value = value;
            edited.$save();

        },

    };
}]);


app.factory('group', ["fb", function (fb) {

    return {
        data: function (groupId) {
        
            var _theGroup = {
                id: groupId,
                events: [],
            };


            fb.child("/groups/"+_theGroup.id).once('value', function(groupSnap) {
                
                _theGroup.name = groupSnap.val().name;

                // Getting group events
                var group_events = groupSnap.val().events;
                for(group_event in group_events) {
                    fb.child("/events/"+group_events[group_event].id).once('value', function(eventSnap) {
                        var event = eventSnap.val();
                        event.id = group_events[group_event].id;
                        event.date = new Date(event.date);
                        _theGroup.events.push(event);
                    });
                }

            });

            return _theGroup;

        },

    };
}]);

app.factory('event', ["$firebaseArray", "fb", function ($firebaseArray, fb) {
    return {

        delete: function(event, group_id) {
            if(confirm("Do you wish to delete this event?")) {

                // Remove in events node
                fb.child("/events/"+event.id).remove();

                // Remove in group > events node
                var ref = fb.child("/groups/"+group_id+"/events/");
                ref.orderByChild("id").equalTo(event.id).on("child_added", function(snapshot) {
                    fb.child("/groups/"+group_id+"/events/"+snapshot.key()).remove();
                });

            }
        },

    };
}]);


app.factory("Auth", ["$firebaseAuth", "fb", 
    function($firebaseAuth, fb) {
        return $firebaseAuth(fb);
    }
]);


app.controller('testController', function(fb, $scope, user) {

    $scope.page = {
        title: 'test',
    };

});

app.controller('topBarController', function(fb, $scope, $location, Auth, user) {

    if(Auth.$getAuth()) $scope.auth = true;
    else $scope.auth = false;

    $scope.logOut = function() {
        $location.path('auth');
        fb.unauth();
    };

    $scope.pick = function(group) {
        user.set(Auth.$getAuth().uid, "current_group", group);
        $location.path("/group/home");
        window.location.reload();
    };

    fb.child("/groups/").once('value', function(snap) {
        $scope.groups = snap.val();
    });
 
});

app.controller('homeController', function(fb, group, $scope, $firebaseObject, Auth, user) {

    $scope.fb = $firebaseObject(fb);

    fb.child("/users/"+Auth.$getAuth().uid+"/current_group").once('value', function(gSnap) {
        $scope.group = group.data(gSnap.val());
        $scope.page = {
            rightBtn: {fa: "bell"},
            title: $scope.group.name,
        };
    });

});

app.controller('authController', function(fb, $scope, Auth, $location, $firebaseObject) {

    $scope.page = {
        // title: "Login",
        // leftBtn: "prev",
        // rightBtn: {fa: "plus", href: "events/new"},
    };

    $scope.auth = Auth;

    $scope.logIn = function(first) {
        $scope.auth.$authWithPassword({
            email: $scope.email,
            password: $scope.password
        }).then(function(authData) {
            console.log("Logged in as:", authData.uid);
            if($scope.new_user) {
                var user_slot = $firebaseObject(fb.child("users/"+$scope.new_user.uid));
                user_slot.$value = {'id': $scope.new_user.uid };
                user_slot.$save();
                console.log("user created with uid: " + $scope.new_user.uid);
                $scope.new_user = false;
            }
            $location.path('/');
        }).catch(function(error) {
            console.error("Authentication failed:", error);
            $scope.error = error;
        });
    };

    $scope.signUp = function() {
        Auth.$createuser({
            email: $scope.email,
            password: $scope.password
        }).then(function(userData) {
            $scope.new_user = userData;
            $scope.logIn();
        }).catch(function(error) {
            console.error(error);
            $scope.error = error;
        });
    };

    $scope.removeuser = function() {
        Auth.$removeuser({
            email: $scope.email,
            password: $scope.password
        }).then(function() {
            $scope.message = "user removed";
        }).catch(function(error) {
            $scope.error = error;
        });
    };

    // any time auth status updates, add the user data to scope
    $scope.auth.$onAuth(function(authData) {
        $scope.authData = authData;
        // console.log(Auth.$getAuth());
    });

});

app.controller('eventListController', function(fb, group, event, $scope, $firebaseArray, Auth) {

    $scope.page = {
        title: "Events",
        leftBtn: "prev",
        rightBtn: {fa: "plus", href: "events/new"},
    };

    $scope.fb = $firebaseArray(fb);

    $scope.event = event;

    fb.child("/users/"+Auth.$getAuth().uid+"/current_group").once('value', function(gSnap) {
        $scope.group_id = group.data(gSnap.val());
    });

    $scope.delete = function(event) {
        $scope.event.delete(event, $scope.group_id);
    }

});

app.controller('singleEventController', function(fb, group, $scope, $firebaseArray, $routeParams) {

    $scope.params = $routeParams;
    $scope.id = $scope.params.eventId;

    $scope.page = {
        leftBtn: {fa: "chevron-left", href: "/"},
        rightBtn: {fa: "edit", href: "events/"+$scope.id+"/edit"},
        title: "Event",
    };

    $scope.fb = $firebaseArray(fb);
    fb.child("/tracks/").once('value', function(snap) {
        $scope.existing_tracks = snap.val();
    });
    fb.child("/events/"+$scope.id).once('value', function(snap) {
        $scope.event = snap.val();
        $scope.event.date = new Date($scope.event.date);
    });

    $scope.event_tracks = $firebaseArray(fb.child("/events/"+$scope.id+"/tracks"));

});

app.controller('eventEditController', function(fb, group, $scope, $firebaseObject, $routeParams, $location) {

    $scope.page = {
        leftBtn: {fa: "chevron-left"},
        rightBtn: "submit",
        title: "Edit event",
    };

    $scope.params = $routeParams;
    $scope.id = $scope.params.eventId;

    $scope.event = $firebaseObject(fb.child("/events/"+$scope.id));

    // STRANGE STUFF: Only way I found to edit date in right format
    // NOT necessary for most objects
    fb.child("/events/"+$scope.id).once('value', function(snap) {
        $scope.date = new Date(snap.val().date);
    });

    $scope.update = function() {
        $scope.event.date = $scope.date.toString();
        $scope.event.$save();
        $location.path('events/'+$scope.id);
    };

});

app.controller('eventSongsController', function(fb, group, $scope, $firebaseArray, $routeParams, $location) {

    $scope.params = $routeParams;
    $scope.id = $scope.params.eventId;

    $scope.tracks = [];

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

app.controller('newEventController', function(fb, group, $scope, $firebaseArray, $location, Auth) {

    $scope.fb = $firebaseArray(fb);

    fb.child("/users/"+Auth.$getAuth().uid+"/current_group").once('value', function(gSnap) {
        $scope.group = group.data(gSnap.val());
        $scope.group_events = $firebaseArray(fb.child("groups/"+$scope.group.id+"/events"));
    });


    $scope.events = $firebaseArray(fb.child("events"));

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

app.controller('newSongController', function(fb, group, $scope, $firebaseArray, $routeParams, $location) {

    $scope.params = $routeParams;
    $scope.id = $scope.params.eventId;

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

app.controller('singleSongController', function(fb, group, $scope, $firebaseObject, $routeParams, $sce) {

    $scope.params = $routeParams;
    $scope.id = $scope.params.songId;

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

app.controller('songEditController', function(fb, group, $scope, $firebaseObject, $routeParams, $location) {

    $scope.params = $routeParams;
    $scope.id = $scope.params.songId;

    $scope.page = {
        leftBtn: "prev",
        rightBtn: "submit",
        title: "Edit song",
    };

    $scope.track = $firebaseObject(fb.child("/tracks/"+$scope.id));

    $scope.update = function() {
        $scope.track.$save();
        $location.path('songs/'+$scope.id);
    };

});