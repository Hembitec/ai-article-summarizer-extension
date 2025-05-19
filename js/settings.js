// js/settings.js

document.addEventListener('DOMContentLoaded', () => {
    const blockedSitesList = document.getElementById('blocked-sites-list');
    const newSiteInput = document.getElementById('new-site');
    const addSiteBtn = document.getElementById('add-site-btn');
    
    // Load saved blocked sites
    loadBlockedSites();
    
    // Event listener for adding a new site
    addSiteBtn.addEventListener('click', () => {
        addBlockedSite();
    });
    
    // Also allow pressing Enter to add a site
    newSiteInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addBlockedSite();
        }
    });
    
    function loadBlockedSites() {
        chrome.storage.sync.get({ blockedSites: [] }, (data) => {
            const blockedSites = data.blockedSites;
            
            // Clear the list
            blockedSitesList.innerHTML = '';
            
            if (blockedSites.length === 0) {
                blockedSitesList.innerHTML = '<li class="site-item">No sites blocked. The extension will appear on all websites.</li>';
                return;
            }
            
            // Add each blocked site to the list
            blockedSites.forEach((site) => {
                addSiteToList(site);
            });
        });
    }
    
    function addBlockedSite() {
        const newSite = newSiteInput.value.trim().toLowerCase();
        
        // Validate input
        if (!newSite) {
            alert('Please enter a valid domain.');
            return;
        }
        
        // Remove any protocols
        let cleanSite = newSite.replace(/^https?:\/\//i, '');
        // Remove paths, queries, etc.
        cleanSite = cleanSite.split('/')[0];
        
        // Get current blocked sites
        chrome.storage.sync.get({ blockedSites: [] }, (data) => {
            const blockedSites = data.blockedSites;
            
            // Check if site is already in the list
            if (blockedSites.includes(cleanSite)) {
                alert('This site is already blocked.');
                return;
            }
            
            // Add the new site to the list
            blockedSites.push(cleanSite);
            
            // Save updated list
            chrome.storage.sync.set({ blockedSites }, () => {
                // Add the new site to the UI
                addSiteToList(cleanSite);
                
                // Clear the input field
                newSiteInput.value = '';
            });
        });
    }
    
    function addSiteToList(site) {
        const listItem = document.createElement('li');
        listItem.className = 'site-item';
        
        const siteText = document.createElement('span');
        siteText.textContent = site;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Remove';
        deleteBtn.addEventListener('click', () => {
            removeBlockedSite(site);
        });
        
        listItem.appendChild(siteText);
        listItem.appendChild(deleteBtn);
        
        // If "No sites blocked" message exists, remove it
        const noSitesMsg = blockedSitesList.querySelector('li');
        if (noSitesMsg && noSitesMsg.textContent.includes('No sites blocked')) {
            blockedSitesList.innerHTML = '';
        }
        
        blockedSitesList.appendChild(listItem);
    }
    
    function removeBlockedSite(site) {
        chrome.storage.sync.get({ blockedSites: [] }, (data) => {
            let blockedSites = data.blockedSites;
            
            // Remove the site from the array
            blockedSites = blockedSites.filter(s => s !== site);
            
            // Save updated list
            chrome.storage.sync.set({ blockedSites }, () => {
                // Reload the list to reflect changes
                loadBlockedSites();
            });
        });
    }
}); 