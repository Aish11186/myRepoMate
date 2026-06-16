document.addEventListener("DOMContentLoaded", () => {
  const apiDot = document.getElementById("apiDot");
  const apiStatusText = document.getElementById("apiStatusText");
  const skillBadge = document.getElementById("skillBadge");
  const techList = document.getElementById("techList");
  const btnOptions = document.getElementById("btnOptions");

  // Load stats
  chrome.storage.local.get(["skillLevel", "knownTech"], (data) => {
    // API is always active now because of the hardcoded key
    apiDot.classList.add("connected");
    apiStatusText.textContent = "AI Ready";

    // Skill Level Badge styling
    if (data.skillLevel) {
      const skill = data.skillLevel;
      skillBadge.textContent = skill;
      skillBadge.className = "profile-val badge"; // Reset
      if (skill === "Beginner") {
        skillBadge.classList.add("beginner");
      } else if (skill === "Advanced") {
        skillBadge.classList.add("advanced");
      }
    } else {
      skillBadge.textContent = "Beginner";
      skillBadge.classList.add("beginner");
    }

    // Comfortable Technologies summary
    if (data.knownTech && Array.isArray(data.knownTech) && data.knownTech.length > 0) {
      techList.textContent = data.knownTech.join(", ");
    } else {
      techList.textContent = "None selected";
    }
  });

  // Action Button to Open Options
  btnOptions.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
});
