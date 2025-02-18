// public/js/index.js
document.addEventListener("DOMContentLoaded", () => {
    /* ========================
       DOM element references
    ======================== */
    const emailInput = document.getElementById("emailInput");
    const passwordInput = document.getElementById("passwordInput");
    const loginButton = document.getElementById("loginBtn");
    const logoutButton = document.getElementById("logoutBtn");
    const loginForm = document.getElementById("loginForm");
    const welcomeSection = document.getElementById("welcome");
    const boardContainer = document.getElementById("boardContainer");

    const columnsDiv = document.getElementById("columns");
    const addColumnBtn = document.getElementById("addColumnBtn");
    const searchInput = document.getElementById("searchInput");

    // Column modal elements
    const addColumnModal = document.getElementById("addColumnModal");
    const columnNameInput = document.getElementById("columnNameInput");
    const saveColumnBtn = document.getElementById("saveColumnBtn");

    // Card modal elements
    const addCardModal = document.getElementById("addCardModal");
    const cardTitleInput = document.getElementById("cardTitleInput");
    const cardContentInput = document.getElementById("cardContentInput");
    const saveCardBtn = document.getElementById("saveCardBtn");
    const cardColorSelect = document.getElementById("cardColorSelect");

    // Comments modal elements
    const addCommentBtn = document.getElementById("addCommentBtn");
    const commentsListDiv = document.getElementById("commentsList");
    const newCommentText = document.getElementById("newCommentText");

    // Top bar user info
    const userAvatarLi = document.getElementById("userAvatarLi");
    const userAvatarImg = document.getElementById("userAvatarImg");
    const userNameSpan = document.getElementById("userNameSpan");

    // Initially hide the board container until user is authenticated
    boardContainer.style.display = "none";

    // Maintain global data about columns and the currently active column ID
    let allColumnsData = [];
    let activeColumnId = null;

    /* ========================
       Modal initialization
    ======================== */
    // Initialize Materialize modals for column, card, and comments
    const addColumnModalInstance = M.Modal.init(document.getElementById("addColumnModal"));
    const addCardModalInstance = M.Modal.init(document.getElementById("addCardModal"));
    const commentsModalInstance = M.Modal.init(document.getElementById("commentsModal"));

    /* ========================
       Dropdown initialization
    ======================== */
    // Initialize Materialize dropdowns
    const allDropdowns = document.querySelectorAll(".dropdown-trigger");
    M.Dropdown.init(allDropdowns, { coverTrigger: false, container: document.body });

    // Initialize Materialize select elements
    const selectElems = document.querySelectorAll("select");
    M.FormSelect.init(selectElems);

    /* ========================
       Double-tap helper
    ======================== */
    // Listens for a double-tap gesture on touch devices and calls the provided callback if detected
    function attachDoubleTap(el, callback, delay = 300) {
        let lastTap = 0;
        el.addEventListener("touchend", function (e) {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            if (tapLength < delay && tapLength > 0) {
                e.preventDefault();
                callback(e);
            }
            lastTap = currentTime;
        });
    }

    /* ========================
       Auth check & Translation
    ======================== */
    // Fetches the user profile from the server using the stored token
    async function fetchUserProfile() {
        // Attempts to retrieve the user's profile. If no token or request fails, returns null
        const token = localStorage.getItem("token");
        if (!token) return null;
        try {
            const resp = await fetch("http://localhost:3000/api/users/me", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!resp.ok) return null;
            return await resp.json();
        } catch (err) {
            console.error("Error fetching user profile:", err);
            return null;
        }
    }

    // Checks if the user is authenticated and updates the UI accordingly
    async function checkAuth() {
        // Looks for a stored token. If present, tries to fetch the user's profile.
        // If the user is valid, show the board; otherwise, show the login form.
        const token = localStorage.getItem("token");
        if (token) {
            const user = await fetchUserProfile();
            if (user) {
                // If authenticated user info is found, hide login screen and display the board
                loginForm.style.display = "none";
                welcomeSection.style.display = "none";
                boardContainer.style.display = "block";
                logoutButton.style.display = "inline-block";
                userAvatarLi.style.display = "flex";
                userNameSpan.textContent = user.username || "User";
                userAvatarImg.src = user.avatar ? user.avatar : "/avatars/default-avatar.png";
                fetchColumns();
            } else {
                // If the token is invalid or the user isn't found, revert to guest view
                userAvatarLi.style.display = "none";
                logoutButton.style.display = "none";
                loginForm.style.display = "flex";
                welcomeSection.style.display = "block";
                boardContainer.style.display = "none";
            }
        } else {
            // If no token is stored, show the login form and hide the board
            userAvatarLi.style.display = "none";
            logoutButton.style.display = "none";
            loginForm.style.display = "flex";
            welcomeSection.style.display = "block";
            boardContainer.style.display = "none";
        }
    }

    // Listen for language change events and refresh columns if needed
    document.addEventListener("languageChanged", () => {
        if (boardContainer.style.display !== "none") {
            fetchColumns();
        }
    });

    /* ========================
       Login / Logout / Notifications
    ======================== */
    // Handles the login button click event
    loginButton.addEventListener("click", async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        // Validate required fields
        if (!email || !password) {
            showNotification(await getTranslation("errorMissingCredentials"), "warning");
            return;
        }
        // Attempt to log in via the API
        try {
            const res = await fetch("http://localhost:3000/api/users/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            if (res.ok) {
                // On success, store the token and notify user
                const data = await res.json();
                localStorage.setItem("token", data.token);
                showNotification(await getTranslation("loginSuccess"), "success");
                emailInput.value = "";
                passwordInput.value = "";
                checkAuth();
            } else {
                showNotification(await getTranslation("loginFailed"), "error");
            }
        } catch (err) {
            console.error("Error logging in:", err);
            showNotification(await getTranslation("errorOccurred"), "error");
        }
    });

    // Handles the logout button click event
    logoutButton.addEventListener("click", async () => {
        // Clear the token from local storage, reset form fields, and update UI
        localStorage.removeItem("token");
        emailInput.value = "";
        passwordInput.value = "";
        showNotification(await getTranslation("logoutSuccess"), "info");
        checkAuth();
    });

    // Displays a notification to the user.
    async function showNotification(messageKey, type = "info") {
        // Retrieves a translated message using messageKey and shows it in a notification container
        const notificationContainer = document.getElementById("notificationContainer");
        const message = await getTranslation(messageKey);
        const notification = document.createElement("div");
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notificationContainer.appendChild(notification);
        setTimeout(() => notification.classList.add("show"), 100);
        setTimeout(() => {
            notification.classList.remove("show");
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Show a success notification if the user was redirected after registration
    document.addEventListener("DOMContentLoaded", async () => {
        const params = new URLSearchParams(window.location.search);
        if (params.has("registered")) {
            showNotification(await getTranslation("registerSuccess"), "success");
        }
    });

    /* ========================
       Columns
    ======================== */
    // Opens the add column modal
    addColumnBtn.addEventListener("click", () => {
        columnNameInput.value = "";
        let instance = M.Modal.getInstance(addColumnModal);
        if (!instance) instance = M.Modal.init(addColumnModal);
        instance.open();
    });

    // Saves a new column to the server
    saveColumnBtn.addEventListener("click", async () => {
        const columnName = columnNameInput.value.trim();
        // Check if column name is provided
        if (!columnName) {
            showNotification(await getTranslation("errorEmptyColumnName"), "warning");
            return;
        }
        // Send request to create a new column
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("http://localhost:3000/api/columns", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ name: columnName }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Error creating column");
            }
            // On success, close the modal manually.
            const modalInstance = M.Modal.getInstance(addColumnModal);
            modalInstance.close();
            fetchColumns();
        } catch (err) {
            console.error(err);
            alert("Failed to create column.");
        }
    });

    // Fetches all columns from the server
    async function fetchColumns() {
        // Sends a GET request to retrieve all columns for the current user
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const res = await fetch("http://localhost:3000/api/columns", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Error fetching columns");
            const columns = await res.json();
            allColumnsData = columns;
            renderColumns(columns);
        } catch (err) {
            console.error(err);
            alert("Failed to fetch columns.");
        }
    }

    // Renames a column on the server
    async function renameColumn(columnId, newName) {
        // Sends a PATCH request to update the column name
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`http://localhost:3000/api/columns/${columnId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ newName }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Error renaming column");
            }
            fetchColumns();
        } catch (err) {
            console.error(err);
            alert("Failed to rename column.");
        }
    }

    // Deletes a column from the server
    async function deleteColumn(columnId) {
        // Sends a DELETE request to remove the specified column
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`http://localhost:3000/api/columns/${columnId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Error deleting column");
            }
            fetchColumns();
        } catch (err) {
            console.error(err);
            alert("Failed to delete column.");
        }
    }

    // Moves a column to a new position on the server
    async function moveColumn(columnId, targetIndex) {
        // Sends a PATCH request to reorder the column by "targetIndex"
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`http://localhost:3000/api/columns/${columnId}/move`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ targetIndex }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Error moving column");
            }
            fetchColumns();
        } catch (err) {
            console.error(err);
            alert("Failed to move column.");
        }
    }

    /* ========================
       Cards
    ======================== */
    // Saves a new card to the server when the "Save Card" button is clicked
    saveCardBtn.addEventListener("click", async () => {
        const title = cardTitleInput.value.trim();
        const content = cardContentInput.value.trim();
        let color = "#ffffff";
        // Check if a custom color is selected
        if (cardColorSelect) {
            color = cardColorSelect.value;
        }
        // Validate required fields
        if (!title) {
            showNotification(await getTranslation("errorEmptyCardTitle"), "warning");
            return;
        }
        if (!content) {
            showNotification(await getTranslation("errorEmptyCardContent"), "warning");
            return;
        }
        // Create the card in the active column
        try {
            await createCard(activeColumnId, title, content, color);
            // On success, close the card creation modal.
            const modalInstance = M.Modal.getInstance(addCardModal);
            modalInstance.close();
        } catch (err) {
            console.error(err);
            alert("Failed to create card.");
        }
    });

    // Creates a new card on the server
    async function createCard(columnId, title, content, color) {
        // Sends a POST request to add a new card to the specified column
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("http://localhost:3000/api/cards", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ columnId, title, content, color }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Error creating card");
            }
            fetchColumns();
        } catch (err) {
            console.error(err);
            alert("Failed to create card.");
        }
    }

    // Updates a card on the server
    async function updateCard(cardId, updates) {
        // Sends a PATCH request to modify card fields (title, content)
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`http://localhost:3000/api/cards/${cardId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(updates),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Error updating card");
            }
            fetchColumns();
        } catch (err) {
            console.error(err);
            alert("Failed to update card.");
        }
    }

    // Deletes a card from the server
    async function deleteCard(cardId) {
        // Sends a DELETE request to remove the specified card
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`http://localhost:3000/api/cards/${cardId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Error deleting card");
            }
            fetchColumns();
        } catch (err) {
            console.error(err);
            showNotification("Failed to delete card.", "error");
        }
    }

    // Moves a card to a new column or position on the server
    async function moveCard(cardId, targetColumnId, targetIndex) {
        // If no specific index is given, default to 0
        if (targetIndex === undefined || targetIndex === null) targetIndex = 0;
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`http://localhost:3000/api/cards/${cardId}/move`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ targetColumnId, targetIndex }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Error moving card");
            }
            fetchColumns();
        } catch (err) {
            console.error(err);
            alert("Failed to move card.");
        }
    }

    /* ========================
       Comments
    ======================== */
    // Opens the comments modal for a specific card.
    async function openCommentsModal(cardId) {
        // Fetches card data (including comments) and displays the comments modal
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const res = await fetch(`http://localhost:3000/api/cards/${cardId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const data = await res.json();
                alert(data.message || "Error loading card");
                return;
            }
            const cardData = await res.json();
            fillCommentsModal(cardData);
            commentsModalInstance.open();
        } catch (err) {
            console.error(err);
            alert("Failed to load card details");
        }
    }

    // Fills the comments modal with comments for a specific card.
    async function fillCommentsModal(card) {
        // Dynamically creates elements for each comment and appends them to the modal
        commentsListDiv.innerHTML = "";
        if (!card.comments || card.comments.length === 0) {
            // If there are no comments, display a "no comments" message
            commentsListDiv.innerHTML = `<p>${await getTranslation("noComments")}</p>`;
        } else {
            // Loop over all comments in the card
            for (const comment of card.comments) {
                const commentDiv = document.createElement("div");
                commentDiv.style.borderBottom = "1px solid #ccc";
                commentDiv.style.padding = "5px 0";

                const topRow = document.createElement("div");
                topRow.style.display = "flex";
                topRow.style.alignItems = "center";
                topRow.style.justifyContent = "space-between";

                const userDiv = document.createElement("div");
                userDiv.style.display = "flex";
                userDiv.style.alignItems = "center";

                const cUser = comment.createdBy?.username || await getTranslation("unknownUser");
                const cAvatar = comment.createdBy?.avatar || "/avatars/default-avatar.png";

                const avatarImg = document.createElement("img");
                avatarImg.src = cAvatar;
                avatarImg.alt = "avatar";
                avatarImg.style.width = "20px";
                avatarImg.style.height = "20px";
                avatarImg.style.borderRadius = "50%";
                avatarImg.style.marginRight = "5px";

                const userNameStrong = document.createElement("strong");
                userNameStrong.textContent = cUser;

                userDiv.appendChild(avatarImg);
                userDiv.appendChild(userNameStrong);

                const dropdownId = `comment-dropdown-${comment._id}`;
                const dropdownTrigger = document.createElement("a");
                dropdownTrigger.className = "btn-flat dropdown-trigger";
                dropdownTrigger.setAttribute("data-target", dropdownId);
                const dotsIcon = document.createElement("i");
                dotsIcon.className = "material-icons";
                dotsIcon.textContent = "more_vert";
                dropdownTrigger.appendChild(dotsIcon);

                topRow.appendChild(userDiv);
                topRow.appendChild(dropdownTrigger);

                const dropdownMenu = document.createElement("ul");
                dropdownMenu.className = "dropdown-content";
                dropdownMenu.id = dropdownId;

                // Edit comment
                const editLi = document.createElement("li");
                const editA = document.createElement("a");
                editA.href = "#!";
                editA.textContent = await getTranslation("editComment");
                editA.addEventListener("click", () => {
                    editCommentInline(card._id, comment);
                });
                editLi.appendChild(editA);
                dropdownMenu.appendChild(editLi);

                // Delete comment
                const delLi = document.createElement("li");
                const delA = document.createElement("a");
                delA.href = "#!";
                delA.textContent = await getTranslation("deleteComment");
                delA.addEventListener("click", () => {
                    deleteComment(card._id, comment._id);
                });
                delLi.appendChild(delA);
                dropdownMenu.appendChild(delLi);

                // Allow double-click to inline-edit the comment text
                const commentTextP = document.createElement("p");
                commentTextP.style.margin = "5px 0";
                commentTextP.textContent = comment.text;
                commentTextP.setAttribute("data-comment-id", comment._id);

                commentTextP.addEventListener("dblclick", () => {
                    const input = document.createElement("input");
                    input.type = "text";
                    input.value = comment.text;
                    commentTextP.replaceWith(input);
                    input.focus();

                    const saveChanges = async () => {
                        const newText = input.value.trim();
                        if (newText && newText !== comment.text) {
                            await updateComment(card._id, comment._id, newText);
                        }
                    };

                    input.addEventListener("blur", () => {
                        saveChanges().then(() => {
                            openCommentsModal(card._id);
                        });
                    });

                    input.addEventListener("keydown", (evt) => {
                        if (evt.key === "Enter") input.blur();
                    });
                });

                // Also attach a double-tap handler for touch devices
                attachDoubleTap(commentTextP, () => {
                    const input = document.createElement("input");
                    input.type = "text";
                    input.value = comment.text;
                    commentTextP.replaceWith(input);
                    input.focus();

                    const saveChanges = async () => {
                        const newText = input.value.trim();
                        if (newText && newText !== comment.text) {
                            await updateComment(card._id, comment._id, newText);
                        }
                    };

                    input.addEventListener("blur", () => {
                        saveChanges().then(() => {
                            openCommentsModal(card._id);
                        });
                    });
                    input.addEventListener("keydown", (evt) => {
                        if (evt.key === "Enter") input.blur();
                    });
                });

                // Show creation and update timestamps
                const cCreatedDate = new Date(comment.createdAt).toLocaleString();
                const cUpdatedDate = new Date(comment.updatedAt).toLocaleString();
                let dateText = `${await getTranslation("created")}: ${cCreatedDate}`;
                if (comment.updatedAt && comment.updatedAt !== comment.createdAt) {
                    dateText += ` | ${await getTranslation("updated")}: ${cUpdatedDate}`;
                }
                const smallDate = document.createElement("small");
                smallDate.className = "grey-text";
                smallDate.textContent = dateText;

                commentDiv.appendChild(topRow);
                commentDiv.appendChild(dropdownMenu);
                commentDiv.appendChild(commentTextP);
                commentDiv.appendChild(smallDate);
                commentsListDiv.appendChild(commentDiv);
            }
        }
        // Reset new comment input field
        newCommentText.value = "";
        M.updateTextFields();

        // Setup button and Enter key handler for adding a new comment
        addCommentBtn.onclick = () => addComment(card._id);
        newCommentText.onkeydown = function (e) {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                addComment(card._id);
            }
        };

        // Reinitialize Materialize dropdowns inside the modal
        const modalDropdowns = document.querySelectorAll(".dropdown-trigger");
        M.Dropdown.init(modalDropdowns, { coverTrigger: false, container: document.body });
    }

    // Allows inline editing of an existing comment
    function editCommentInline(cardId, comment) {
        // Replaces the comment text <p> with an <input> and saves changes on blur or Enter
        const commentTextP = commentsListDiv.querySelector(`p[data-comment-id="${comment._id}"]`);
        if (!commentTextP) {
            console.error("Comment text element not found!");
            return;
        }
        const input = document.createElement("input");
        input.type = "text";
        input.value = comment.text;
        commentTextP.replaceWith(input);
        input.focus();
        const saveChanges = async () => {
            const newText = input.value.trim();
            if (newText && newText !== comment.text) {
                await updateComment(cardId, comment._id, newText);
            }
        };
        input.addEventListener("blur", () => {
            saveChanges().then(() => {
                openCommentsModal(cardId);
            });
        });
        input.addEventListener("keydown", (evt) => {
            if (evt.key === "Enter") input.blur();
        });
    }

    // Updates a comment's text on the server
    async function updateComment(cardId, commentId, newText) {
        // Sends a PATCH request to update the comment text
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const res = await fetch(`http://localhost:3000/api/cards/${cardId}/comments/${commentId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ text: newText }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Error updating comment");
            }
            openCommentsModal(cardId);
        } catch (err) {
            console.error(err);
            showNotification(await getTranslation("errorUpdatingComment"), "warning");
        }
    }

    // Deletes a comment from the server
    async function deleteComment(cardId, commentId) {
        // Sends a DELETE request to remove the specified comment
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const res = await fetch(`http://localhost:3000/api/cards/${cardId}/comments/${commentId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Error deleting comment");
            }
            openCommentsModal(cardId);
        } catch (err) {
            console.error(err);
            showNotification(await getTranslation("errorDeletingComment"), "warning");
        }
    }

    // Adds a new comment to the card on the server
    async function addComment(cardId) {
        // Submits the entered comment text to the server
        const token = localStorage.getItem("token");
        if (!token) return;
        const textVal = newCommentText.value.trim();
        if (!textVal) {
            showNotification(await getTranslation("errorEmptyComment"), "warning");
            return;
        }
        try {
            const res = await fetch(`http://localhost:3000/api/cards/${cardId}/comments`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ text: textVal }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Error adding comment");
            }
            openCommentsModal(cardId);
        } catch (err) {
            console.error(err);
            alert("Failed to add comment.");
        }
    }

    /* ========================
       Render columns & cards using Sortable.js for drag & drop
    ======================== */
    function renderColumns(columns) {
        // Renders each column (and its cards) in the UI,
        // applies search filtering, and sets up drag-and-drop (sortable) interactions.
        const searchTerm = (searchInput?.value || "").trim().toLowerCase();
        columnsDiv.innerHTML = "";

        // Render each column directly into columnsDiv
        columns.forEach((col) => {
            // Check if the column has any cards matching the search term
            let matchCount = 0;
            col.cards.forEach((card) => {
                const titleLower = card.title.toLowerCase();
                const contentLower = card.content.toLowerCase();
                if (!searchTerm || titleLower.includes(searchTerm) || contentLower.includes(searchTerm)) {
                    matchCount++;
                }
            });
            // If searching and this column doesn't match any cards, skip rendering it
            if (searchTerm && matchCount === 0) return;

            // Create the column wrapper element with fixed width
            const columnEl = document.createElement("div");
            columnEl.className = "columnWrapper";
            columnEl.style.display = "flex";
            columnEl.style.flexDirection = "column";
            columnEl.style.width = "245px";
            columnEl.style.flexShrink = "0";
            columnEl.dataset.columnId = col._id;

            // Create a container that wraps both header and cards with a white background
            const columnContainer = document.createElement("div");
            columnContainer.className = "card"; // reuse card styling for white background
            columnContainer.style.width = "100%";
            columnContainer.style.backgroundColor = "#fff";
            columnContainer.style.display = "flex";
            columnContainer.style.flexDirection = "column";
            columnContainer.style.padding = "0"; // remove extra padding

            // --- Header Container ---
            const headerContainer = document.createElement("div");
            headerContainer.className = "card-content";
            headerContainer.style.position = "relative";
            headerContainer.style.padding = "10px";
            headerContainer.style.marginBottom = "0";

            // Create a drag-handle for the column (both desktop and mobile)
            const dragHandleColumn = document.createElement("span");
            dragHandleColumn.className = "drag-handle-column";
            dragHandleColumn.style.cursor = "grab";
            dragHandleColumn.style.marginRight = "140px";
            dragHandleColumn.innerHTML = '<i class="material-icons">drag_handle</i>';
            headerContainer.appendChild(dragHandleColumn);

            // Create the column title
            const columnHeader = document.createElement("span");
            columnHeader.className = "card-title columnTitle";
            columnHeader.textContent = col.name;

            // Double-click or double-tap to rename column inline
            columnHeader.addEventListener("dblclick", () => {
                const input = document.createElement("input");
                input.type = "text";
                input.value = col.name;
                columnHeader.replaceWith(input);
                input.focus();
                const saveChanges = async () => {
                    const newName = input.value.trim();
                    if (newName && newName !== col.name) {
                        await renameColumn(col._id, newName);
                    }
                };
                input.addEventListener("blur", () => {
                    saveChanges().then(() => {
                        fetchColumns();
                    });
                });
                input.addEventListener("keydown", (evt) => {
                    if (evt.key === "Enter") input.blur();
                });
            });
            attachDoubleTap(columnHeader, () => {
                const input = document.createElement("input");
                input.type = "text";
                input.value = col.name;
                columnHeader.replaceWith(input);
                input.focus();
                const saveChanges = async () => {
                    const newName = input.value.trim();
                    if (newName && newName !== col.name) {
                        await renameColumn(col._id, newName);
                    }
                };
                input.addEventListener("blur", () => {
                    saveChanges().then(() => {
                        fetchColumns();
                    });
                });
                input.addEventListener("keydown", (evt) => {
                    if (evt.key === "Enter") input.blur();
                });
            });
            headerContainer.appendChild(columnHeader);

            // Create dropdown trigger for column actions (Add card, Rename, Delete)
            const dropdownId = "dropdown-" + col._id;
            const dropdownTrigger = document.createElement("a");
            dropdownTrigger.className = "btn-flat dropdown-trigger right";
            dropdownTrigger.setAttribute("data-target", dropdownId);
            dropdownTrigger.style.position = "absolute";
            dropdownTrigger.style.top = "10px";
            dropdownTrigger.style.right = "10px";

            const icon = document.createElement("i");
            icon.className = "material-icons";
            icon.textContent = "more_vert";
            dropdownTrigger.appendChild(icon);
            headerContainer.appendChild(dropdownTrigger);

            // Create dropdown menu
            const dropdownMenu = document.createElement("ul");
            dropdownMenu.className = "dropdown-content";
            dropdownMenu.id = dropdownId;

            // "Add Card" option
            const addCardLi = document.createElement("li");
            const addCardA = document.createElement("a");
            addCardA.href = "#!";
            addCardA.setAttribute("data-i18n", "addCard");
            addCardA.textContent = getTranslation("addCard");
            addCardA.addEventListener("click", () => {
                activeColumnId = col._id;
                cardTitleInput.value = "";
                cardContentInput.value = "";
                if (cardColorSelect) {
                    M.FormSelect.init(cardColorSelect);
                }
                M.updateTextFields();
                addCardModalInstance.open();
            });
            addCardLi.appendChild(addCardA);
            dropdownMenu.appendChild(addCardLi);

            // "Rename Column" option
            const renameLi = document.createElement("li");
            const renameA = document.createElement("a");
            renameA.href = "#!";
            renameA.setAttribute("data-i18n", "renameColumn");
            renameA.textContent = getTranslation("renameColumn");
            renameA.addEventListener("click", () => {
                const header = headerContainer.querySelector(".columnTitle");
                const input = document.createElement("input");
                input.type = "text";
                input.value = col.name;
                header.replaceWith(input);
                input.focus();
                const saveChanges = async () => {
                    const newName = input.value.trim();
                    if (newName && newName !== col.name) {
                        await renameColumn(col._id, newName);
                    }
                };
                input.addEventListener("blur", () => {
                    saveChanges().then(() => fetchColumns());
                });
                input.addEventListener("keydown", (evt) => {
                    if (evt.key === "Enter") input.blur();
                });
            });
            attachDoubleTap(renameA, () => {
                const header = headerContainer.querySelector(".columnTitle");
                const input = document.createElement("input");
                input.type = "text";
                input.value = col.name;
                header.replaceWith(input);
                input.focus();
                const saveChanges = async () => {
                    const newName = input.value.trim();
                    if (newName && newName !== col.name) {
                        await renameColumn(col._id, newName);
                    }
                };
                input.addEventListener("blur", () => {
                    saveChanges().then(() => fetchColumns());
                });
                input.addEventListener("keydown", (evt) => {
                    if (evt.key === "Enter") input.blur();
                });
            });
            renameLi.appendChild(renameA);
            dropdownMenu.appendChild(renameLi);

            // "Delete Column" option
            const deleteLi = document.createElement("li");
            const deleteA = document.createElement("a");
            deleteA.href = "#!";
            deleteA.setAttribute("data-i18n", "deleteColumn");
            deleteA.textContent = getTranslation("deleteColumn");
            deleteA.addEventListener("click", () => {
                deleteColumn(col._id);
            });
            deleteLi.appendChild(deleteA);
            dropdownMenu.appendChild(deleteLi);

            headerContainer.appendChild(dropdownMenu);
            columnContainer.appendChild(headerContainer);

            // --- Cards Container (Drop Zone) ---
            const cardsContainer = document.createElement("div");
            cardsContainer.className = "cardColumnDropZone";
            cardsContainer.style.marginTop = "0";
            cardsContainer.style.padding = "10px";

            // Render each card in this column
            col.cards.forEach(async (card) => {
                // Skip cards that don't match the search term
                const titleLower = card.title.toLowerCase();
                const contentLower = card.content.toLowerCase();
                if (searchTerm && !(titleLower.includes(searchTerm) || contentLower.includes(searchTerm))) {
                    return;
                }
                const cardDiv = document.createElement("div");
                cardDiv.className = "card cardItem";
                cardDiv.dataset.cardId = card._id;

                const cardContent = document.createElement("div");
                cardContent.className = "card-content";
                cardContent.style.backgroundColor = card.color || "#ffffff";

                // Add a drag-handle for the card (both desktop and mobile)
                const dragHandleCard = document.createElement("span");
                dragHandleCard.className = "drag-handle-card";
                dragHandleCard.style.cursor = "grab";
                dragHandleCard.style.marginRight = "140px";
                dragHandleCard.innerHTML = '<i class="material-icons">drag_handle</i>';
                cardContent.appendChild(dragHandleCard);

                // Card title
                const cardTitle = document.createElement("span");
                cardTitle.className = "card-title";
                cardTitle.textContent = card.title;
                // Double-click or double-tap to edit card title inline
                cardTitle.addEventListener("dblclick", () => {
                    const input = document.createElement("input");
                    input.type = "text";
                    input.value = card.title;
                    cardTitle.replaceWith(input);
                    input.focus();

                    const saveChanges = async () => {
                        const newVal = input.value.trim();
                        if (newVal && newVal !== card.title) {
                            await updateCard(card._id, { title: newVal });
                        }
                    };
                    input.addEventListener("blur", () => {
                        saveChanges().then(() => {
                            fetchColumns();
                        });
                    });
                    input.addEventListener("keydown", (evt) => {
                        if (evt.key === "Enter") input.blur();
                    });
                });
                attachDoubleTap(cardTitle, () => {
                    const input = document.createElement("input");
                    input.type = "text";
                    input.value = card.title;
                    cardTitle.replaceWith(input);
                    input.focus();
                    const saveChanges = async () => {
                        const newVal = input.value.trim();
                        if (newVal && newVal !== card.title) {
                            await updateCard(card._id, { title: newVal });
                        }
                    };
                    input.addEventListener("blur", () => {
                        saveChanges().then(() => {
                            fetchColumns();
                        });
                    });
                    input.addEventListener("keydown", (evt) => {
                        if (evt.key === "Enter") input.blur();
                    });
                });
                cardContent.appendChild(cardTitle);

                // Card content/description
                const cardText = document.createElement("p");
                cardText.textContent = card.content;
                // Double-click or double-tap to edit card content inline
                cardText.addEventListener("dblclick", () => {
                    const textarea = document.createElement("textarea");
                    textarea.value = card.content;
                    cardText.replaceWith(textarea);
                    textarea.focus();
                    const saveChanges = async () => {
                        const newVal = textarea.value.trim();
                        if (newVal && newVal !== card.content) {
                            await updateCard(card._id, { content: newVal });
                        }
                    };
                    textarea.addEventListener("blur", () => {
                        saveChanges().then(() => {
                            fetchColumns();
                        });
                    });
                    textarea.addEventListener("keydown", (evt) => {
                        if (evt.key === "Enter") {
                            evt.preventDefault();
                            textarea.blur();
                        }
                    });
                });
                attachDoubleTap(cardText, () => {
                    const input = document.createElement("input");
                    input.type = "text";
                    input.value = card.content;
                    cardText.replaceWith(input);
                    input.focus();
                    const saveChanges = async () => {
                        const newVal = input.value.trim();
                        if (newVal && newVal !== card.content) {
                            await updateCard(card._id, { content: newVal });
                        }
                    };
                    input.addEventListener("blur", () => {
                        saveChanges().then(() => {
                            fetchColumns();
                        });
                    });
                    input.addEventListener("keydown", (evt) => {
                        if (evt.key === "Enter") input.blur();
                    });
                });
                cardContent.appendChild(cardText);

                // Display creator info and timestamps
                const metaInfo = document.createElement("p");
                metaInfo.className = "grey-text";
                const creatorName = (card.createdBy && card.createdBy.username) ? card.createdBy.username : await getTranslation("unknownUser");
                const creatorAvatar = (card.createdBy && card.createdBy.avatar) ? card.createdBy.avatar : "/avatars/default-avatar.png";
                const createdDate = new Date(card.createdAt).toLocaleString();
                const updatedDate = new Date(card.updatedAt).toLocaleString();
                const createdText = await getTranslation("created");
                const updatedText = await getTranslation("updated");
                let timestampsText = `${createdText}: ${createdDate}`;
                if (card.updatedAt && card.updatedAt !== card.createdAt) {
                    timestampsText += ` | ${updatedText}: ${updatedDate}`;
                }
                let avatarHtml = "";
                if (creatorAvatar) {
                    avatarHtml = `<img src="${creatorAvatar}" alt="avatar" style="width:20px; height:20px; border-radius:50%; margin-right:5px;">`;
                }
                metaInfo.innerHTML = `${avatarHtml} <strong>${creatorName}</strong><br>${timestampsText}`;
                cardContent.appendChild(metaInfo);

                // Small "X" button to delete the card
                const deleteCardBtn = document.createElement("button");
                deleteCardBtn.className = "btn-small delete-card-btn";
                deleteCardBtn.textContent = "X";
                deleteCardBtn.title = "Delete card";
                deleteCardBtn.addEventListener("click", () => {
                    deleteCard(card._id);
                });
                cardContent.appendChild(deleteCardBtn);

                // Button to open the comments modal for this card
                const viewCommentsBtn = document.createElement("button");
                viewCommentsBtn.className = "btn-small blue lighten-2 left";
                viewCommentsBtn.style.marginRight = "5px";
                viewCommentsBtn.setAttribute("data-i18n", "comments");
                viewCommentsBtn.textContent = getTranslation("comments");
                viewCommentsBtn.addEventListener("click", () => {
                    openCommentsModal(card._id);
                });
                cardContent.appendChild(viewCommentsBtn);

                cardDiv.appendChild(cardContent);
                cardsContainer.appendChild(cardDiv);
            });

            columnContainer.appendChild(cardsContainer);
            columnEl.appendChild(columnContainer);
            columnsDiv.appendChild(columnEl);
        });

        // Initialize Sortable for columns (reordering entire columns)
        if (window.sortableColumns) {
            window.sortableColumns.destroy();
        }
        window.sortableColumns = Sortable.create(columnsDiv, {
            animation: 150,
            handle: '.drag-handle-column', // Only allow dragging when the column handle is used
            onEnd: function (evt) {
                const columnId = evt.item.dataset.columnId;
                const newIndex = evt.newIndex;
                moveColumn(columnId, newIndex);
            },
        });

        // Initialize Sortable for cards in each column
        document.querySelectorAll(".cardColumnDropZone").forEach((container) => {
            if (container.sortableInstance) {
                container.sortableInstance.destroy();
            }
            container.sortableInstance = Sortable.create(container, {
                group: "cards",
                animation: 150,
                handle: '.drag-handle-card', // Only allow dragging when the card handle is used
                onEnd: function (evt) {
                    const cardId = evt.item.dataset.cardId;
                    const targetColumnId = evt.to.closest(".columnWrapper").dataset.columnId;
                    const newIndex = evt.newIndex;
                    moveCard(cardId, targetColumnId, newIndex);
                },
            });
        });

        // Reinitialize Materialize dropdowns
        const dropdowns = document.querySelectorAll(".dropdown-trigger");
        M.Dropdown.init(dropdowns, { coverTrigger: false, container: document.body });
    }

    // Enable drag-to-scroll on the board container (#columns)
    (function enableDragScroll() {
        const board = document.getElementById("columns");
        if (!board) return;
        let isDown = false;
        let startX, scrollLeft, startY, scrollTop;

        board.addEventListener("mousedown", (e) => {
            // Only start scrolling if the target is NOT a drag handle (for reordering)
            if (!e.target.closest('.drag-handle-column') && !e.target.closest('.drag-handle-card')) {
                isDown = true;
                board.classList.add("dragging-scroll"); // optional: for visual styling
                startX = e.pageX - board.offsetLeft;
                scrollLeft = board.scrollLeft;
                startY = e.pageY - board.offsetTop;
                scrollTop = board.scrollTop;
            }
        });

        board.addEventListener("mouseleave", () => {
            isDown = false;
            board.classList.remove("dragging-scroll");
        });
        board.addEventListener("mouseup", () => {
            isDown = false;
            board.classList.remove("dragging-scroll");
        });
        board.addEventListener("mousemove", (e) => {
            if (!isDown) return;
            e.preventDefault();
            if (window.innerWidth > 1000) {
                // Desktop: horizontal scrolling
                const x = e.pageX - board.offsetLeft;
                const walk = (x - startX) * 1; // adjust multiplier as needed
                board.scrollLeft = scrollLeft - walk;
            } else {
                // Mobile: vertical scrolling
                const y = e.pageY - board.offsetTop;
                const walkY = (y - startY) * 1;
                board.scrollTop = scrollTop - walkY;
            }
        });

        // Enable similar touch events for mobile
        board.addEventListener("touchstart", (e) => {
            if (!e.target.closest('.drag-handle-column') && !e.target.closest('.drag-handle-card')) {
                isDown = true;
                const touch = e.touches[0];
                startX = touch.pageX - board.offsetLeft;
                scrollLeft = board.scrollLeft;
                startY = touch.pageY - board.offsetTop;
                scrollTop = board.scrollTop;
            }
        });
        board.addEventListener("touchend", () => {
            isDown = false;
        });
        board.addEventListener("touchmove", (e) => {
            if (!isDown) return;
            const touch = e.touches[0];
            if (window.innerWidth > 1000) {
                const x = touch.pageX - board.offsetLeft;
                const walk = (x - startX) * 1;
                board.scrollLeft = scrollLeft - walk;
            } else {
                const y = touch.pageY - board.offsetTop;
                const walkY = (y - startY) * 1;
                board.scrollTop = scrollTop - walkY;
            }
        });
    })();

    /* ========================
       Search
    ======================== */
    // Filters cards and columns by title/content as the user types in the search input
    if (searchInput) {
        searchInput.addEventListener("input", () => {
            renderColumns(allColumnsData);
        });
    }

    /* ========================
       Start / Register Check
    ======================== */
    // Initial authentication check to decide which view to show
    checkAuth();

    // Listen for language changes and show a success message if newly registered
    document.addEventListener("languageChanged", async () => {
        const params = new URLSearchParams(window.location.search);
        if (params.has("registered")) {
            const message = await getTranslation("registerSuccess");
            showNotification(message, "success");
            history.replaceState(null, "", window.location.pathname);
        }
    });
});
