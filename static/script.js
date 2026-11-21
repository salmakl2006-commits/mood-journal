// Variables globales
let selectedMood = "";
let editingId = null;
let moodChart = null;


// 1. Sélectionner une humeur
function selectMood(mood) {

    selectedMood = mood;

    const buttons = document.querySelectorAll(".mood-buttons button");

    buttons.forEach(button => {
        button.classList.remove("selected");

        if (button.textContent.trim() === mood) {
            button.classList.add("selected");
        }
    });
}


// 2. Obtenir la date locale
function getLocalDate() {

    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


// 3. Convertir une date en objet Date
function parseEntryDate(dateString) {

    if (!dateString) return null;

    // Format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {

        const [year, month, day] = dateString.split("-").map(Number);

        return new Date(year, month - 1, day);
    }

    // Format DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {

        const [day, month, year] = dateString.split("/").map(Number);

        return new Date(year, month - 1, day);
    }

    return null;
}


// 4. Filtrer les entrées par date
function filterEntries(entries) {

    const filter = document.getElementById("periodFilter");

    const period = filter ? filter.value : "all";

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    return entries.filter(entry => {

        const entryDate = parseEntryDate(entry.date);

        if (!entryDate || isNaN(entryDate.getTime())) {
            return false;
        }

        entryDate.setHours(0, 0, 0, 0);

        // Aujourd'hui
        if (period === "today") {

            return entryDate.getTime() === today.getTime();
        }

        // Cette semaine (du lundi à aujourd'hui)
        if (period === "week") {

            const startOfWeek = new Date(today);

            const day = (today.getDay() + 6) % 7;

            startOfWeek.setDate(today.getDate() - day);

            return entryDate >= startOfWeek && entryDate <= today;
        }

        // Ce mois
        if (period === "month") {

            return entryDate.getMonth() === today.getMonth() &&
                   entryDate.getFullYear() === today.getFullYear();
        }

        // Toutes les entrées
        return true;
    });
}


// 5. Ajouter ou modifier une entrée
async function saveEntry() {

    const content = document.getElementById("journal").value.trim();

    const message = document.getElementById("message");

    if (selectedMood === "") {

        message.textContent = "Please select your mood first!";

        return;
    }

    if (content === "") {

        message.textContent = "Please write something!";

        return;
    }

    const entry = {

        mood: selectedMood,

        content: content,

        date: editingId !== null
            ? undefined
            : getLocalDate()
    };

    let url = "/add";

    let method = "POST";

    if (editingId !== null) {

        url = `/update/${editingId}`;

        method = "PUT";
    }

    try {

        const response = await fetch(url, {

            method: method,

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(entry)
        });

        if (!response.ok) {
            throw new Error("Error saving entry");
        }

        message.textContent = editingId !== null
            ? "Entry updated successfully! 💜"
            : "Entry saved successfully! 💜";

        document.getElementById("journal").value = "";

        selectedMood = "";

        editingId = null;

        document.getElementById("saveButton").textContent = "Save Entry 💜";

        document.querySelectorAll(".mood-buttons button").forEach(button => {
            button.classList.remove("selected");
        });

        displayEntries();

    } catch (error) {

        console.error(error);

        message.textContent = "Something went wrong!";
    }
}


// 6. Afficher les entrées
async function displayEntries() {

    try {

        const response = await fetch("/entries");

        if (!response.ok) {
            throw new Error("Error loading entries");
        }

        const entries = await response.json();

        const filteredEntries = filterEntries(entries);

        const container = document.getElementById("entries");

        container.innerHTML = "";

        if (filteredEntries.length === 0) {

            container.innerHTML = "<p>No entries found for this period.</p>";
        }

        filteredEntries.forEach(entry => {

            const card = document.createElement("div");

            card.className = "entry-card";

            const title = document.createElement("h3");
            title.textContent = entry.mood;

            const date = document.createElement("small");
            date.textContent = entry.date;

            const content = document.createElement("p");
            content.textContent = entry.content;

            // Bouton Modifier
            const editButton = document.createElement("button");

            editButton.textContent = "Edit ✏️";

            editButton.className = "edit-btn";

            editButton.onclick = () => editEntry(entry);

            // Bouton Supprimer
            const deleteButton = document.createElement("button");

            deleteButton.textContent = "Delete 🗑️";

            deleteButton.className = "delete-btn";

            deleteButton.onclick = () => deleteEntry(entry.id);

            card.appendChild(title);
            card.appendChild(date);
            card.appendChild(content);
            card.appendChild(editButton);
            card.appendChild(deleteButton);

            container.appendChild(card);
        });

        // Actualiser les statistiques avec les entrées filtrées
        displayStatistics(filteredEntries);

    } catch (error) {

        console.error(error);
    }
}


// 7. Modifier une entrée
function editEntry(entry) {

    document.getElementById("journal").value = entry.content;

    selectMood(entry.mood);

    editingId = entry.id;

    document.getElementById("saveButton").textContent = "Update Entry 💜";

    document.getElementById("message").textContent = "Editing your entry...";
}


// 8. Supprimer une entrée
async function deleteEntry(id) {

    const confirmation = confirm("Are you sure you want to delete this entry?");

    if (!confirmation) return;

    try {

        const response = await fetch(`/delete/${id}`, {

            method: "DELETE"
        });

        if (!response.ok) {
            throw new Error("Error deleting entry");
        }

        displayEntries();

    } catch (error) {

        console.error(error);
    }
}


// 9. Calculer les statistiques et afficher le graphique
function displayStatistics(entries) {

    const statistics = document.getElementById("statistics");

    const moods = ["Happy 😊", "Sad 😢", "Angry 😠", "Calm 😌"];

    const colors = ["#f1c40f", "#3498db", "#e74c3c", "#2ecc71"];

    const counts = moods.map(mood => {

        return entries.filter(entry => entry.mood === mood).length;
    });

    const total = counts.reduce((sum, count) => sum + count, 0);

    statistics.innerHTML = "";

    const totalText = document.createElement("p");

    totalText.textContent = `Total entries: ${total}`;

    statistics.appendChild(totalText);

    moods.forEach((mood, index) => {

        const percentage = total === 0
            ? 0
            : Math.round((counts[index] / total) * 100);

        const paragraph = document.createElement("p");

        paragraph.textContent =
            `${mood}: ${counts[index]} entries (${percentage}%)`;

        statistics.appendChild(paragraph);
    });


    // Détruire l'ancien graphique
    if (moodChart !== null) {

        moodChart.destroy();
    }

    // Créer le nouveau graphique
    const ctx = document.getElementById("moodChart");

    moodChart = new Chart(ctx, {

        type: "doughnut",

        data: {

            labels: moods,

            datasets: [{

                data: counts,

                backgroundColor: colors,

                borderWidth: 2,

                borderColor: "#ffffff"
            }]
        },

        options: {

            responsive: true,

            maintainAspectRatio: true,

            plugins: {

                legend: {
                    position: "bottom"
                },

                tooltip: {

                    callbacks: {

                        label: function(context) {

                            const value = context.raw;

                            const percentage = total === 0
                                ? 0
                                : Math.round((value / total) * 100);

                            return `${context.label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        },

        plugins: [{

            // Afficher les pourcentages sur le graphique
            afterDatasetsDraw(chart) {

                const { ctx } = chart;

                ctx.save();

                chart.data.datasets[0].data.forEach((value, index) => {

                    if (value === 0 || total === 0) return;

                    const meta = chart.getDatasetMeta(0);

                    const arc = meta.data[index];

                    const position = arc.tooltipPosition();

                    const percentage = Math.round((value / total) * 100);

                    ctx.fillStyle = "#ffffff";

                    ctx.font = "bold 13px Arial";

                    ctx.textAlign = "center";

                    ctx.textBaseline = "middle";

                    ctx.fillText(`${percentage}%`, position.x, position.y);
                });

                ctx.restore();
            }
        }]
    });
}


// 10. Charger les entrées au démarrage
displayEntries();