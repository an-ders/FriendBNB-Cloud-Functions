/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {
    onDocumentWritten,
    onDocumentCreated,
    onDocumentUpdated,
    onDocumentDeleted,
  } = require("firebase-functions/v2/firestore");
//const logger = require("firebase-functions/logger");
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp(functions.config().firebase)
const db = admin.firestore();

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// exports.bookingCreated = onDocumentCreated("Properties/{propertyId}/Bookings/{bookingId}", (event) => {
//     let documentId = event.params.documentId;
//     const snapshot = event.data;
//     if (!snapshot) {
//         console.log("No data associated with the event");
//         return;
//     }
//     const data = snapshot.data();
// //${documentId} - from: ${data.name}
//     var message = {
//         token: "cfLIBtVMkk8frMY4mVvQze:APA91bEZbunyLQSWyz2KfwZ1ma-bB6KvY23hVPwxsRqJ9x-coIUwotmCZgQpGKvWR80-21-m_Q0O0En2eRJHDbsv9rqdt6fvIStY7EvJrYyWRu33AJYLzDkd7jxJIPevhTwFiY-MmbFY",
//         notification: {
//             title: 'Booking created!',
//             body: `booking id: `
//         }
//     }
//     admin.messaging().send(message)
// });

// exports.notificationOnPropertyCreate = functions.firestore.document("Properties/{propertyId}").onWrite((event) => {
// 	//const userId = event.params.userId; 
//     //const FCMToken = functions.firestore.document(`/Accounts/${userId}`).once('FCM');

//     const payload = {
//         token: "fnOuep1O00MGqL4k0mNmjI:APA91bEuDZJvNL8i0pr91AzUCnHvjJiWHq6oeNZi97I7tGXiBu4_kW7faG4gbr_7xzaNkx4ddt9pLoW4oo0Ic_jNFiFjgN6r6y1hLxFJY6e4li-Ycqv5Av7u8DJJ_b5CwP6ANBsIl0OG",
//         notification: {
//             title: "firestore v1",
//             body: "userId"
//         }
//     };
    
//     admin.messaging().send(payload)
// });

exports.notificationOnBookingCreate = functions.firestore.document("Properties/{propertyId}/Bookings/{bookingId}").onCreate((snap, context) => {
	const propertyId = context.params.propertyId;
    const bookingId = context.params.bookingId; 
    const booking = snap.data()

    db.collection('Accounts').doc(booking.ownerId).get().then(doc => {
        const devices = doc.data().devices
        devices.forEach(fcm => {
            sendBookingCreationMessage(propertyId, bookingId, booking, fcm)
        });
    });
});

function sendBookingCreationMessage(propertyId, bookingId, booking, fcm) {
    const payload = {
        token: fcm,
        notification: {
            title: `New Booking!`,
            body: `${booking.name} booked your property from ${booking.start.toDate().toDateString().slice(4, -5)} to ${booking.end.toDate().toDateString().slice(4, -5)}. View the booking now!`,
        },
        data: {
            type: 'owned',
            propertyId: propertyId,
            bookingId: bookingId,
        }
    };
    
    admin.messaging().send(payload)
}

exports.notificationOnBookingUpdate = functions.firestore.document("Properties/{propertyId}/Bookings/{bookingId}").onUpdate((change, context) => {
	const propertyId = context.params.propertyId;
    const bookingId = context.params.bookingId; 
    const before = change.before.data()
    const after = change.after.data()
    db.collection('Properties').doc(propertyId).get().then(doc => {
        const property = doc.data()
        db.collection('Accounts').doc(after.userId).get().then(account => {
            const devices = account.data().devices
            devices.forEach(fcm => {
                sendBookingUpdateMessage(propertyId, bookingId, before, after, property, fcm)
            });
        });
    });
});

function sendBookingUpdateMessage(propertyId, bookingId, before, after, property, fcm) {
    var payload = {
        token: fcm,
        notification: {
            title: `Booking Updated!`,
            body: `View your booking at ${property.info.nickname} for ${after.start.toDate().toDateString().slice(4, -5)} to ${after.end.toDate().toDateString().slice(4, -5)} has been updated.`,
        },
        data: {
            type: 'friend',
            propertyId: propertyId,
            bookingId: bookingId,
        }
    };

    if (before.status != after.status) {
        payload = {
            token: fcm,
            notification: {
                title: `Booking Status Updated!`,
                body: `Your booking at ${property.info.nickname} for ${after.start.toDate().toDateString().slice(4, -5)} to ${after.end.toDate().toDateString().slice(4, -5)} is now: ${after.status}. View the details.`,
            },
            data: {
                type: 'friend',
                propertyId: propertyId,
                bookingId: bookingId,
            }
        };
    }
    
    admin.messaging().send(payload)
}