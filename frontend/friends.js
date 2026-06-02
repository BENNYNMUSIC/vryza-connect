// Ensure data and data.friends exist, and that it is an array before looping
if (data && data.success && Array.isArray(data.friends)) {
  
  // Clear your container element here first (e.g., chatListContainer.innerHTML = "") 
  // so lists don't continuously stack up on refresh.

  data.friends.forEach(friend => {
    // Build your chat list elements safely here
    console.log(`Rendering friend: ${friend.username}`);
    
    // Fallback default avatar check if profilePic is missing
    const avatar = friend.profilePic || "images/default-avatar.png"; 
  });

} else {
  console.warn("No friends found or failed to load data array accurately.");
}