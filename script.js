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
        templateUrl: 'views/auth.html',
        controller: 'authController',
    })
    .when('/group/pick', {
        templateUrl: 'views/pick_group.html',
        controller: 'pickGroupController',
        resolve: resolve,
    })
    .when('/group/home', {
        templateUrl: 'views/home.html',
        controller: 'homeController',
        resolve: resolve,
    })
    .when('/conversations/', {
        templateUrl: 'views/conversations/index.html',
        controller: 'messageListController',
        resolve: resolve,
    })
    .when('/conversations/new', {
        templateUrl: 'views/conversations/new.html',
        controller: 'newMessageController',
        resolve: resolve,
    })
    .when('/conversations/:id', {
        templateUrl: 'views/conversations/single.html',
        controller: 'singleMessageController',
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
    .when('/songs/', {
        templateUrl: 'views/songs/index.html',
        controller: 'songListController',
        resolve: resolve,
    })
    .when('/songs/new/', {
        templateUrl: 'views/songs/new.html',
        controller: 'newSongController',
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

app.filter('parseDate', function() {
    return function(input) {
        return new Date(input);
    };
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

                console.log("group_id");
                console.log(group_id);


                // Remove in events node
                fb.child("/events/"+event.id).remove();

                // Remove in group > events node
                var ref = fb.child("/groups/"+group_id+"/events/");
                ref.orderByChild("id").equalTo(event.id).on("child_added", function(snapshot) {
                    console.log("DELETE GROUP EVENT "+snapshot.key());
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

app.factory("thisUser", ["$firebaseObject", "Auth", "fb",
    function($firebaseObject, Auth, fb) {
        return $firebaseObject(fb.child("/users/"+Auth.$getAuth().uid));
    }
]);



app.controller('testController', function(fb, $scope, thisUser) {

    $scope.page = {
        title: 'test',
    };

    $scope.thisUser = thisUser;

});

app.controller('pickGroupController', function(fb, $scope, $location, $firebaseArray, $firebaseObject, Auth, user) {

    $scope.page = {
        title: 'Groups',
        rightBtn: {fa: "plus"},
    };

    $scope.groups = $firebaseArray(fb.child("/groups/"));
    $scope.groups_obj = $firebaseObject(fb.child("/groups/"));
    $scope.user_groups = $firebaseObject(fb.child("users/"+Auth.$getAuth().uid+"/groups/"));

    $scope.askToJoin = function(id) {
        // Add to this user's groups
        var refUserGroups = fb.child("/users/"+Auth.$getAuth().uid+"/groups/"+id);
        var userGroups = $firebaseObject(refUserGroups);
        userGroups.status = "pending";
        userGroups.$save().then(function(ref) {
            // Add to group's users
            var refGroupUsers = fb.child("/groups/"+id+"/users/"+Auth.$getAuth().uid);
            var groupUsers = $firebaseObject(refGroupUsers);
            groupUsers.status = "pending";
            groupUsers.$save().then( function(ref) { console.log(ref); }, function(error) {} );
        }, function(error) {
            console.log("Error:", error);
        });

    };

    $scope.pick = function(id) {
        var refGroupUsers = fb.child("/groups/"+id+"/users/"+Auth.$getAuth().uid);

        refGroupUsers.once('value', function (data) {
            if(data.val().status == "member" || data.val().status == "admin") {
                user.set(Auth.$getAuth().uid, "current_group", id);
                $location.path("/group/home");
                $route.reload();
            }
            else {
                alert("Sorry, you don't belong to that group yet.");
            }
        }, function (err) {
            alert("Sorry, an error occured");
            console.log(err);
        });

        
    };


    $scope.createGroup = function() {
        // Insert new group with $scope.name + $scope.type
        // .then set group/newRef/admin as auth.uid
    };

});

app.controller('topBarController', function(fb, $scope, $location, Auth, user) {

    if(Auth.$getAuth()) $scope.auth = true;
    else $scope.auth = false;

    $scope.logOut = function() {
        $location.path('auth');
        fb.unauth();
    };

    fb.child("/groups/").once('value', function(snap) {
        $scope.groups = snap.val();
    });
 
});

app.controller('homeController', function(fb, group, $scope, $firebaseObject, Auth, user, $location) {

    $scope.fb = $firebaseObject(fb);

    if(Auth.$getAuth()) {  
        // Getting user's group
        fb.child("/users/"+Auth.$getAuth().uid+"/current_group").once('value', function(gSnap) {
            if(!gSnap.val()) $location.path("/group/pick");
            else {
                $scope.group = group.data(gSnap.val());
                $scope.now = new Date();
                $scope.page = {
                    rightBtn: {fa: "bell"},
                    title: $scope.group.name,
                };
            }
        });
    }

});


app.controller('messageListController', function(fb, group, $scope, $firebaseArray, Auth) {

    $scope.page = {
        title: "Conversations",
        leftBtn: {fa: "chevron-left", href: "group/home"},
        rightBtn: {fa: "plus", href: "conversations/new"},
    };

    fb.child("/users/"+Auth.$getAuth().uid+"/current_group").once('value', function(gSnap) {
        $scope.conversations = $firebaseArray(fb.child("groups/"+gSnap.val()+"/conversations"));
    });

    $scope.latest = function(conversation) {

        var array = [];
        var total = 0;
        angular.forEach(conversation.messages, function(element) {
            array.push(element);
            total++;
        });

        return array[total-1];

    }

});

app.controller('newMessageController', function(fb, group, $scope, $firebaseArray, Auth, $location) {

    fb.child("/users/"+Auth.$getAuth().uid+"/current_group").once('value', function(gSnap) {
        // $scope.group = group.data(gSnap.val());
        $scope.conversations = $firebaseArray(fb.child("groups/"+gSnap.val()+"/conversations"));
        var new_chat = {
            // date: new Date(),
            created_by: Auth.$getAuth().uid,
            messages: [],
        };
        $scope.conversations.$add(new_chat).then(function(ref) {
            $location.path('conversations/'+ref.key());
        });
    });


});


app.controller('singleMessageController', function(fb, $scope, group, $firebaseObject, $firebaseArray, Auth, $routeParams) {

    $scope.page = {
        title: "Group chat",
        leftBtn: {fa: "chevron-left", href: "conversations"},
        // rightBtn: {fa: "user-plus"},
    };

    $scope.user_email = Auth.$getAuth().password.email;

    $scope.keepUp = function() {
        // window.scrollTo(0,document.body.scrollHeight);
        $('html,body').animate({scrollTop: document.body.scrollHeight},"fast");
    };

    $scope.id = $routeParams.id;

    fb.child("/users/"+Auth.$getAuth().uid+"/current_group").once('value', function(gSnap) {
        $scope.group = group.data(gSnap.val());
        var url = "/groups/"+gSnap.val()+"/conversations/"+$scope.id;
        $scope.conversation = $firebaseObject(fb.child(url));
        $scope.messages = $firebaseArray(fb.child(url+"/messages"));
        fb.child(url+"/messages").on('child_added', function(childSnapshot, prevChildKey) {
            $scope.keepUp();
        });
    });

    $scope.send = function() {
        if($scope.compose) {
            $scope.messages
            .$add({
                text: $scope.compose,
                author: Auth.$getAuth().password.email,
                date: new Date().toString(),
            })
            .then(function(ref) {
                $scope.keepUp();
                $scope.compose = "";
            });
        }
    };

    angular.element(document).ready(function () {
        setTimeout(function() {
            $scope.keepUp();
        }, 1000);
    });


});


app.controller('songListController', function(fb, group, $scope, $firebaseObject, Auth, user) {

    $scope.fb = $firebaseObject(fb);


    $scope.page = {
        title: "Songs",
        leftBtn: {fa: "chevron-left", href: "group/home"},
        rightBtn: {fa: "plus", href: "songs/new"},
    };


    // Getting user's group
    fb.child("/users/"+Auth.$getAuth().uid+"/current_group").once('value', function(gSnap) {
        $scope.group = group.data(gSnap.val());
        // Getting group's songs
        fb.child("/groups/"+gSnap.val()+"/tracks").once('value', function(plSnap) {
            $scope.tracks = [];
            for (song in plSnap.val()) {
                // Getting each song's name
                fb.child("/tracks/"+plSnap.val()[song].id).once('value', function(sSnap) {
                    $scope.tracks.push({id: plSnap.val()[song].id, name: sSnap.val().name, artist: sSnap.val().artist});
                });
            }
        });
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
            $location.path('/group/home');
        }).catch(function(error) {
            console.error("Authentication failed:", error);
            $scope.error = error;
        });
    };

    $scope.signUp = function() {
        $scope.auth.$createUser({
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

    $scope.removeUser = function() {
        $scope.auth.$removeuser({
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

app.controller('eventListController', function(fb, group, event, $scope, $firebaseArray, Auth, $location, $route) {

    $scope.page = {
        title: "Events",
        leftBtn: {fa: "chevron-left", href: "group/home"},
        rightBtn: {fa: "plus", href: "events/new"},
    };

    $scope.fb = $firebaseArray(fb);

    $scope.event = event;

    fb.child("/users/"+Auth.$getAuth().uid+"/current_group").once('value', function(gSnap) {
        $scope.group = group.data(gSnap.val());
        $scope.delete = function(event) {
            $scope.event.delete(event, $scope.group.id);
            $location.path('events/');
            $route.reload();
        }
    });


});

app.controller('singleEventController', function(fb, group, $scope, $firebaseArray, $routeParams) {

    $scope.params = $routeParams;
    $scope.id = $scope.params.eventId;

    $scope.page = {
        leftBtn: {fa: "chevron-left", href: "events/"},
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

app.controller('eventSongsController', function(fb, group, $scope, $firebaseArray, $routeParams, $location, Auth) {

    $scope.params = $routeParams;
    $scope.id = $scope.params.eventId;

    $scope.fb = $firebaseArray(fb);
    $scope.tracks = [];

    // Getting current event tracks
    fb.child("/events/"+$scope.id+"/tracks").once('value', function(snap) {
        var event_tracks = snap.val();
        
        // Getting user's group
        fb.child("/users/"+Auth.$getAuth().uid+"/current_group").once('value', function(gSnap) {

            // Getting group's songs
            fb.child("/groups/"+gSnap.val()+"/tracks").once('value', function(plSnap) {
                for (song in plSnap.val()) {
                    // Getting each song's name
                    fb.child("/tracks/"+plSnap.val()[song].id).once('value', function(sSnap) {
                        $scope.tracks.push({id: plSnap.val()[song].id, name: sSnap.val().name});
                    });
                }
            });

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

    $scope.event = {
        title: "", 
        type: "rehearsal",
        // date: new Date(),
    };

    $scope.page = {
        title: "Add event",
        leftBtn: "prev",
        rightBtn: "submit",
    };

    $scope.fb = $firebaseArray(fb);

    fb.child("/users/"+Auth.$getAuth().uid+"/current_group").once('value', function(gSnap) {
        $scope.group = group.data(gSnap.val());
        $scope.group_events = $firebaseArray(fb.child("groups/"+$scope.group.id+"/events"));
        $scope.events = $firebaseArray(fb.child("events"));

        $scope.addEvent = function() {
            $scope.event.date = $scope.event.date.toString();
            $scope.events.$add($scope.event).then(function(ref) {
                var id = ref.key();
                console.log("added event with id " + id);
                $scope.group_events.$add({'id': id}).then(function(ref) {
                    $location.path('events/');
                });
            });
        };

    });

});


app.controller('newSongController', function(fb, $scope, $firebaseArray, $routeParams, $location, Auth) {

    $scope.params = $routeParams;

    $scope.tracks = $firebaseArray(fb.child("tracks"));

    fb.child("/users/"+Auth.$getAuth().uid+"/current_group").once('value', function(groupSnap) {
    
        $scope.group_tracks = $firebaseArray(fb.child("groups/"+groupSnap.val()+"/tracks"));

        $scope.addSong = function() {
            $scope.tracks.$add($scope.song).then(function(ref) {
                var id = ref.key();
                console.log("added song with id " + id);
                $scope.group_tracks.$add({'id': id}).then(function(ref) {
                    if($scope.params.eventId) {
                        $location.path('events/'+$scope.params.eventId+'/songs');
                    }
                    else {
                        $location.path('songs/');
                    }
                });
            });
        };

    });

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