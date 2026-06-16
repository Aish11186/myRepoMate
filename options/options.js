document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const skillCards = document.querySelectorAll(".skill-card");
  const techChips = document.querySelectorAll("#techChips .chip");
  const learnTechInput = document.getElementById("learnTech");
  const profileForm = document.getElementById("profileForm");
  const statusBanner = document.getElementById("statusBanner");
  const statusMessage = document.getElementById("statusMessage");
  const statusIcon = document.getElementById("statusIcon");
  const btnTest = document.getElementById("btnTest");
  const btnSave = document.getElementById("btnSave");

  let selectedSkill = "Beginner";

  // 1. Skill Card Selection
  skillCards.forEach(card => {
    card.addEventListener("click", () => {
      skillCards.forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      selectedSkill = card.getAttribute("data-level");
    });
  });

  // 2. Tech Chips Selection
  techChips.forEach(chip => {
    chip.addEventListener("click", () => {
      chip.classList.toggle("active");
    });
  });

  // 3. Load Saved Settings
  chrome.storage.local.get(["skillLevel", "knownTech", "learnTech"], (data) => {
    if (data.skillLevel) {
      selectedSkill = data.skillLevel;
      skillCards.forEach(c => {
        if (c.getAttribute("data-level") === selectedSkill) {
          c.classList.add("active");
        } else {
          c.classList.remove("active");
        }
      });
    }

    if (data.knownTech && Array.isArray(data.knownTech)) {
      techChips.forEach(chip => {
        if (data.knownTech.includes(chip.getAttribute("data-tech"))) {
          chip.classList.add("active");
        }
      });
    }

    if (data.learnTech) {
      learnTechInput.value = data.learnTech;
    }
  });

  // 4. Save Settings
  profileForm.addEventListener("submit", (e) => {
    e.preventDefault();
    saveData();
  });

  function saveData(onDone = null) {
    const learnTech = learnTechInput.value.trim();
    
    const knownTech = [];
    document.querySelectorAll("#techChips .chip.active").forEach(chip => {
      knownTech.push(chip.getAttribute("data-tech"));
    });

    chrome.storage.local.set({
      skillLevel: selectedSkill,
      knownTech,
      learnTech
    }, () => {
      showBanner("Settings saved successfully!", "success");
      if (onDone) onDone();
    });
  }

  // 5. Test Gemini API Connection with the fallback key rotation
  btnTest.addEventListener("click", async () => {
    btnTest.textContent = "Testing...";
    btnTest.disabled = true;

    const keys = self.GEMINI_API_KEYS || [];
    if (keys.length === 0) {
      showBanner("No API keys found in config.js.", "error");
      btnTest.textContent = "Test API Connection";
      btnTest.disabled = false;
      return;
    }

    let success = false;
    let lastError = null;
    let successfulKeysCount = 0;

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!key || key.includes("YOUR_SECOND_API_KEY_HERE")) continue;

      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Hello" }] }]
          })
        });

        if (response.ok) {
          success = true;
          successfulKeysCount++;
        } else {
          const errorData = await response.json().catch(() => ({}));
          lastError = errorData.error?.message || `HTTP ${response.status}`;
        }
      } catch (err) {
        lastError = err.message;
      }
    }

    if (success) {
      showBanner(`API connection succeeded! (${successfulKeysCount} key(s) verified & ready).`, "success");
    } else {
      showBanner(`Connection failed: ${lastError || 'All keys failed'}`, "error");
    }

    btnTest.textContent = "Test API Connection";
    btnTest.disabled = false;
  });

  // Utility: Show Status Banner
  function showBanner(message, type) {
    statusBanner.className = `status-banner ${type}`;
    statusMessage.textContent = message;
    statusIcon.textContent = type === "success" ? "✓" : "✗";
    
    statusBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    setTimeout(() => {
      statusBanner.style.display = "flex";
    }, 50);

    // Auto-hide after 5 seconds
    if (window.bannerTimeout) clearTimeout(window.bannerTimeout);
    window.bannerTimeout = setTimeout(() => {
      statusBanner.style.display = "none";
    }, 5000);
  }
});
