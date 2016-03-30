
// Parse.Cloud.define('hello', function(req, res) {
//   res.success('Hi');
// });

// Use Parse.Cloud.define to define as many cloud functions as you want.

// Make sure all installations point to the current user.
Parse.Cloud.beforeSave(Parse.Installation, function(request, response) {
    Parse.Cloud.useMasterKey();
    if (request.user) {
        request.object.set('user', request.user);
    } else {
        request.object.unset('user');
    }
    response.success();
});

Parse.Cloud.afterSave("Emotions", function(request) {
  
  if (!request.object.existed()) {
  
  // First grab the information we will need from the request
  var emotionId = request.object.id;
  var userId = request.object.get('user').id;
                      
  Parse.Cloud.useMasterKey();
                      
  // Let's increment the emotion counter of the user
  var userQuery = new Parse.Query(Parse.User);
  var targetUser = new Parse.User();
  targetUser.id = userId;
  targetUser.increment("emotionsCount");
  targetUser.save(null, {
    success: function(updatedUser) {
      // The user was updated successfully.
      console.log('Incremented emotions count of user with id: ' + updatedUser.id);
    },
    error: function(updatedUser, error) {
      // The user was not updated successfully.
      console.log('Failed to increment emotions count of user with id: ' + updatedUser.id + ' and error message: ' + error.message);
    }
  });
  
  // Check if we are already subscribed for notifiations, if not we will subscribe
  var Notification = Parse.Object.extend("Notifications");
  var notificationsQuery = new Parse.Query(Notification);

  var Emotion = new Parse.Object.extend("Emotions");
  var targetEmotion = new Emotion();
  targetEmotion.id = emotionId;

  var subscribingUser = new Parse.User();
  subscribingUser.id = userId;
                      
  notificationsQuery.equalTo('emotion', targetEmotion);
  notificationsQuery.equalTo('targetUser', subscribingUser);
                      
  notificationsQuery.first().then(
    function(notification) {
      console.log('Notification query succeded, let\'s see if we got anything: ' + notification);
      if(!notification) {
        // Looks like we are not subscribed so lets go and subscribe
        console.log('Looks like the result was empty, let\'s add a new one.');
        var newNotification = new Notification();
                                  
        newNotification.set("type", "postCreator");                                        
        newNotification.set("emotion", targetEmotion);
        newNotification.set("targetUser", subscribingUser);
                                                      
        // Let's save the new notification
        newNotification.save(null, {
          success: function(notification) {
            console.log('Added notification subscription with objectId: ' + notification.id)
          },
          error: function(error) {
            console.log('Failed to create new notification with error message: ' + error.message);
            throw "Failed to create new notification with error message: " + error.message;
          }
        });
      } else {
        // Looks like we are subscribed do nothing more and return the selected notification
        console.log('Existing notification subscription with objectId: ' + notification.id);
      }
    },
    function(error) {
      console.log('Failed to check for existing notification with error message: ' + error.message);
    }
  );
                      
  }
                      
});

Parse.Cloud.afterDelete("Activities", function(request) {
                        
  var targetEmotionId = request.object.get('emotion').id;
  var activityType = request.object.get('type');
                        
  // Let's first decrement the like or comment counter in the emotion
  var Emotion = Parse.Object.extend("Emotions");
  var targetEmotion = new Emotion();
  targetEmotion.id = targetEmotionId;
                        
  if(activityType == "like") {
    targetEmotion.increment("likesCount", -1);
  }
  if(activityType == "comment") {
    targetEmotion.increment("commentsCount", -1);
  }
                        
  targetEmotion.save(null, {
    success: function(updatedEmotion) {
      // The emotion was updated successfully.
      console.log('Decremented "' + activityType + '" count of emotion with id: ' + updatedEmotion.id);
    },
    error: function(updatedEmotion, error) {
      // The emotion was not updated successfully.
      console.log('Failed decrement "' + activityType + '" count of emotion with id: ' + updatedEmotion.id + ' and error message: ' + error.message);
    }
  });

});

Parse.Cloud.afterSave("Activities", function(request) {
                      
  // First grab the information we will need from the request
  var activityType = request.object.get('type');
  var userScreenName = request.object.get('userScreenName');
  var commentText = request.object.get('comment');
  var targetEmotionId = request.object.get('emotion').id;
  var activityUser = request.object.get('user').id;
  var activityTargetUser = request.object.get('targetUser').id;
                      
  // Let's first increment the like or comment counter in the emotion
  var Emotion = Parse.Object.extend("Emotions");
  var targetEmotion = new Emotion();
  targetEmotion.id = targetEmotionId;
                      
  if(activityType == "like") {
    targetEmotion.increment("likesCount");
  }
  if(activityType == "comment") {
    targetEmotion.increment("commentsCount");
  }

  targetEmotion.save(null, {
    success: function(updatedEmotion) {
      // The emotion was updated successfully.
      console.log('Incremented "' + activityType + '" count of emotion with id: ' + updatedEmotion.id);
    },
    error: function(updatedEmotion, error) {
      // The emotion was not updated successfully.
      console.log('Failed increment "' + activityType + '" count of emotion with id: ' + updatedEmotion.id + ' and error message: ' + error.message);
    }
  });
  
  // Second check if we are already subscribed for notifiations, if not we will subscribe
  var Notification = Parse.Object.extend("Notifications");
  var notificationsQuery = new Parse.Query(Notification);
                      
  var subscribingUser = new Parse.User();
  subscribingUser.id = activityUser;

  notificationsQuery.equalTo('emotion', targetEmotion);
  notificationsQuery.equalTo('targetUser', subscribingUser);

  notificationsQuery.first().then(
    function(notification) {
      console.log('Notification query succeded, let\'s see if we got anything: ' + notification);
      if(!notification) {
        // Looks like we are not subscribed so lets go and subscribe
        console.log('Looks like the result was empty, let\'s add a new one.');
        var newNotification = new Notification();
        
        if(activityTargetUser != activityUser) {
          newNotification.set("type", "postFollow");
          // We might need to differentiate the types of notificatons subscirptions
          // further and based on the type of activity of the user with the emotion.
          // if(activityType == "like") {
          //  newNotification.set("type", "postLike");
          //}
          //if(activityType == "comment") {
          //  newNotification.set("type", "postComment");
          //}
        } else {
          newNotification.set("type", "postCreator");
        }
                           
        newNotification.set("emotion", targetEmotion);
        newNotification.set("targetUser", subscribingUser);

        // Let's save the new notification
        return newNotification.save();
      } else {
        // Looks like we are subscribed do nothing more and return the selected notification
        console.log('Existing notification subscription with objectId: ' + notification.id);
        Parse.Promise.as("success");
        return notification;
      }
    },
    function(error) {
      console.log('Failed to check for existing notification with error message: ' + error.message);
    }
  ).then(
    function(notification) {
      console.log('Notification returned with objectId: ' + notification.id);
        
      // Let's now get the users that we need to notify on the new activity
      var targetUsersForPushNotificationQuery = new Parse.Query(Notification);
      targetUsersForPushNotificationQuery.equalTo('emotion', targetEmotion);

      return targetUsersForPushNotificationQuery.find();
    },
    function(error) {
      console.log('Failed to create new notification with error message: ' + error.message);
    }
  ).then(
    function(targetUsersForPushNotification) {
      console.log('Successfully retrieved ' + targetUsersForPushNotification.length + ' users to send push notifications.');
      // Do something with the returned Parse.Object values
      for (var i = 0; i < targetUsersForPushNotification.length; i++) {
        var notificationResult = targetUsersForPushNotification[i];
        var pushNotificationTargetUserId = notificationResult.get('targetUser').id;
        console.log('Target user for push notification ID: ' + pushNotificationTargetUserId);
        // 1) If it is our activity on our emotion
        // 2) If it is our activity on someone elses emotion
        // Then we are not supposed to receive push notifications
         console.log('activityUser ' + activityUser);
         console.log('activityTargetUser ' + activityTargetUser);
         console.log('pushNotificationTargetUserId ' + pushNotificationTargetUserId);
         console.log('activityUser != activityTargetUser && activityUser != pushNotificationTargetUserId' + activityUser != activityTargetUser && activityUser != pushNotificationTargetUserId);
        if( activityUser != activityTargetUser && activityUser != pushNotificationTargetUserId ) {
         console.log('We will now try to send out the push notification to the target user');
         
         var alertText = "";
         if(activityType == "like") {
           if(activityTargetUser != pushNotificationTargetUserId) {
             // The user getting the push notification is the owner of the emotion
             alertText = userScreenName + " also liked an Emotion!";
           } else {
             // The user getting the push notification has like the emotion
             alertText = userScreenName + " liked your Emotion!";
           }
         }
         if(activityType == "comment") {
           if(activityTargetUser != pushNotificationTargetUserId) {
             // The user getting the push notification is the owner of the emotion
             alertText = userScreenName + " also commented on an Emotion '" + commentText + "'";
            } else {
             // The user getting the push notification has like the emotion
             alertText = userScreenName + " commented on your Emotion '" + commentText + "'";
           }
         }
         
         var targetUser = new Parse.User();
         targetUser.id = pushNotificationTargetUserId;
         var pushQuery = new Parse.Query(Parse.Installation);
         pushQuery.equalTo('deviceType', 'ios');
         pushQuery.equalTo('user', targetUser);
         
         Parse.Push.send({
             where: pushQuery, // Set our Installation query
             data: {
               alert: alertText,
               eId: targetEmotionId,
               badge: "Increment",
               sound: "default"
             }
         }, {
           success: function() {
             // Push was successful
             console.log('Push was successful');
         },
           error: function(error) {
             throw "Got an error " + error.code + " : " + error.message;
           }
         });
        }
      }
    },
    function(error) {
        throw "Failed to get users to send push notifications with error message: " + error.message;
    }
  );
});

Parse.Cloud.afterSave("Reports", function(request) {
                      
  if(request.object.get('targetEmotion') != null) {
    var targetEmotion = request.object.get('targetEmotion').id;
  } else {
    var targetEmotion = "General Report";
  }
  var reportingUser = request.object.get('reportingUser').id;
                      
  var Mailgun = require('mailgun');
  Mailgun.initialize('sandbox65f28574d7ab44f2b16ee6632283204c.mailgun.org', 'key-b6ab98abbafdf9047d1416de17ad9111');
                      
  Mailgun.sendEmail({
    to: "alkzoupas@gmail.com",
    from: "reports@pinjii.com",
    subject: "New Report",
    text: "Target Emotion --> " + targetEmotion + " has been reported by User --> " + reportingUser + ". Please review as soon as possible!"
  }, {
    success: function(httpResponse) {
       console.log(httpResponse);
       console.log("Email sent!");
     },
     error: function(httpResponse) {
       console.error(httpResponse);
       console.log("Uh oh, something went wrong");
     }
   });
});
