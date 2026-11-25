const diskSizeInput = document.getElementById("diskSize");
const headPositionInput = document.getElementById("headPosition");
const requestsInput = document.getElementById("requests");
const algorithmInput = document.getElementById("algorithms");
const directionInput = document.getElementById("direction");

const runBtn = document.getElementById("runBtn");
const resetBtn = document.getElementById("resetBtn");
const message = document.getElementById("message");

const totalMovementOutput = document.getElementById("totalMovement");
const processedRequestsOutput = document.getElementById("processedRequests");
const averageMovementOutput = document.getElementById("averageMovement");
const bestAlgorithmOutput = document.getElementById("bestAlgorithm");
const sequenceOutput = document.getElementById("sequenceOutput");

const processedCountOutput = document.getElementById("processedCount");
const totalStepsOutput = document.getElementById("totalSteps");
const movementTableBody = document.getElementById("movementTableBody");
const comparisonTableBody = document.getElementById("comparisonTableBody");
const insightText = document.getElementById("insightText");

const ALGORITHMS = ["FCFS", "SSTF", "SCAN", "CSCAN", "LOOK", "CLOOK"];

let movementChart = null;
let comparisonChart = null;

// ========================================
// 2. READ AND VALIDATE USER INPUT
// ========================================
function getUserInputs() {
    const diskSize = Number(diskSizeInput.value);
    const head = Number(headPositionInput.value);

    const requests = requestsInput.value
        .split(",")
        .map(value => value.trim())
        .map(value => Number(value));

    return {
        diskSize,
        head,
        requests,
        algorithm: algorithmInput.value,
        direction: directionInput.value
    };
}

function validateInputs(data) {
    if (diskSizeInput.value.trim() === "" ||
        !Number.isInteger(data.diskSize) ||
        data.diskSize <= 0) {
        return "Please enter a valid positive disk size.";
    }

    if (headPositionInput.value.trim() === "" ||
        !Number.isInteger(data.head) ||
        data.head < 0 ||
        data.head >= data.diskSize) {
        return "Head position must be between 0 and " + (data.diskSize - 1) + ".";
    }

    if (requestsInput.value.trim() === "") {
        return "Please enter at least one disk request.";
    }

    const requestParts = requestsInput.value.split(",");

    if (requestParts.some(value => value.trim() === "")) {
        return "Please enter requests as comma-separated integers.";
    }

    if (data.requests.some(value => !Number.isInteger(value))) {
        return "Every request must be a valid integer.";
    }

    if (data.requests.some(value => value < 0 || value >= data.diskSize)) {
        return "Requests must be between 0 and " + (data.diskSize - 1) + ".";
    }

    if (!ALGORITHMS.includes(data.algorithm)) {
        return "Please select a valid algorithm.";
    }

    if (!["left", "right"].includes(data.direction)) {
        return "Please select a valid head direction.";
    }

    return null;
}

// ========================================
// 3. COMMON HELPER FUNCTIONS
// ========================================
function calculateTotalMovement(sequence) {
    let total = 0;

    for (let i = 0; i < sequence.length - 1; i++) {
        total += Math.abs(sequence[i + 1] - sequence[i]);
    }

    return total;
}

function createResult(sequence, requests) {
    const totalMovement = calculateTotalMovement(sequence);

    return {
        sequence,
        totalMovement,
        averageMovement: requests.length === 0
            ? 0
            : totalMovement / requests.length,
        steps: Math.max(0, sequence.length - 1)
    };
}

function splitRequests(head, requests) {
    const left = [];
    const right = [];
    const atHead = [];

    requests.forEach(request => {
        if (request < head) {
            left.push(request);
        } else if (request > head) {
            right.push(request);
        } else {
            atHead.push(request);
        }
    });

    left.sort((a, b) => a - b);
    right.sort((a, b) => a - b);

    return { left, right, atHead };
}

// ========================================
// 4. FCFS - FIRST COME FIRST SERVED
// ========================================
function calculateFCFS(head, requests) {
    const sequence = [head, ...requests];
    return createResult(sequence, requests);
}

// ========================================
// 5. SSTF - SHORTEST SEEK TIME FIRST
// ========================================
function calculateSSTF(head, requests) {
    const pending = [...requests];
    const sequence = [head];
    let currentHead = head;

    while (pending.length > 0) {
        let nearestIndex = 0;
        let shortestDistance = Math.abs(pending[0] - currentHead);

        for (let i = 1; i < pending.length; i++) {
            const distance = Math.abs(pending[i] - currentHead);

            if (distance < shortestDistance) {
                shortestDistance = distance;
                nearestIndex = i;
            }
        }

        const nextRequest = pending.splice(nearestIndex, 1)[0];
        sequence.push(nextRequest);
        currentHead = nextRequest;
    }

    return createResult(sequence, requests);
}

// ========================================
// 6. SCAN
// ========================================
function calculateSCAN(head, requests, diskSize, direction) {
    const { left, right, atHead } = splitRequests(head, requests);
    const sequence = [head, ...atHead];

    if (direction === "right") {
        sequence.push(...right);

        // SCAN travels to the disk's last cylinder before reversing.
        if (sequence[sequence.length - 1] !== diskSize - 1) {
            sequence.push(diskSize - 1);
        }

        sequence.push(...left.slice().reverse());
    } else {
        sequence.push(...left.slice().reverse());

        // SCAN travels to cylinder 0 before reversing.
        if (sequence[sequence.length - 1] !== 0) {
            sequence.push(0);
        }

        sequence.push(...right);
    }

    return createResult(sequence, requests);
}

// ========================================
// 7. C-SCAN
// ========================================
function calculateCSCAN(head, requests, diskSize, direction) {
    const { left, right, atHead } = splitRequests(head, requests);
    const sequence = [head, ...atHead];

    if (direction === "right") {
        sequence.push(...right);

        if (left.length > 0) {
            if (sequence[sequence.length - 1] !== diskSize - 1) {
                sequence.push(diskSize - 1);
            }

            // Circular jump from the last cylinder to cylinder 0.
            sequence.push(0);
            sequence.push(...left);
        }
    } else {
        sequence.push(...left.slice().reverse());

        if (right.length > 0) {
            if (sequence[sequence.length - 1] !== 0) {
                sequence.push(0);
            }

            // Circular jump from cylinder 0 to the last cylinder.
            sequence.push(diskSize - 1);
            sequence.push(...right.slice().reverse());
        }
    }

    return createResult(sequence, requests);
}

// ========================================
// 8. LOOK
// ========================================
function calculateLOOK(head, requests, direction) {
    const { left, right, atHead } = splitRequests(head, requests);
    const sequence = [head, ...atHead];

    if (direction === "right") {
        sequence.push(...right);
        sequence.push(...left.slice().reverse());
    } else {
        sequence.push(...left.slice().reverse());
        sequence.push(...right);
    }

    return createResult(sequence, requests);
}

// ========================================
// 9. C-LOOK
// ========================================
function calculateCLOOK(head, requests, direction) {
    const { left, right, atHead } = splitRequests(head, requests);
    const sequence = [head, ...atHead];

    if (direction === "right") {
        sequence.push(...right);

        // Circular jump to the lowest pending request on the left.
        sequence.push(...left);
    } else {
        sequence.push(...left.slice().reverse());

        // Circular jump to the highest pending request on the right.
        sequence.push(...right.slice().reverse());
    }

    return createResult(sequence, requests);
}

// ========================================
// 10. RUN A SELECTED ALGORITHM
// ========================================
function runAlgorithm(algorithm, data) {
    switch (algorithm) {
        case "FCFS":
            return calculateFCFS(data.head, data.requests);
        case "SSTF":
            return calculateSSTF(data.head, data.requests);
        case "SCAN":
            return calculateSCAN(data.head, data.requests, data.diskSize, data.direction);
        case "CSCAN":
            return calculateCSCAN(data.head, data.requests, data.diskSize, data.direction);
        case "LOOK":
            return calculateLOOK(data.head, data.requests, data.direction);
        case "CLOOK":
            return calculateCLOOK(data.head, data.requests, data.direction);
        default:
            throw new Error("Unknown algorithm selected.");
    }
}

// ========================================
// 11. DISPLAY SELECTED ALGORITHM RESULTS
// ========================================
function displayMainResults(result, requestCount) {
    totalMovementOutput.textContent = result.totalMovement;
    processedRequestsOutput.textContent = requestCount;
    averageMovementOutput.textContent = result.averageMovement.toFixed(2);
    sequenceOutput.textContent = result.sequence.join(" → ");
    processedCountOutput.textContent = requestCount;
    totalStepsOutput.textContent = result.steps;
}

// ========================================
// 12. DISPLAY MOVEMENT TABLE
// ========================================
function displayMovementTable(sequence) {
    movementTableBody.innerHTML = "";

    if (sequence.length <= 1) {
        movementTableBody.innerHTML =
            '<tr><td colspan="4">No movement to display.</td></tr>';
        return;
    }

    let rows = "";

    for (let i = 0; i < sequence.length - 1; i++) {
        const currentPosition = sequence[i];
        const nextPosition = sequence[i + 1];
        const movement = Math.abs(nextPosition - currentPosition);

        rows += `
            <tr>
                <td>${i + 1}</td>
                <td>${currentPosition}</td>
                <td>${nextPosition}</td>
                <td>${movement}</td>
            </tr>
        `;
    }

    movementTableBody.innerHTML = rows;
}

// ========================================
// 13. MOVEMENT CHART
// ========================================
function createMovementChart(sequence) {
    const canvas = document.getElementById("movementChart");

    if (movementChart) {
        movementChart.destroy();
    }

    movementChart = new Chart(canvas, {
        type: "line",
        data: {
            labels: sequence.map((value, index) => "Step " + index),
            datasets: [{
                label: "Disk Head Position",
                data: sequence,
                borderColor: "#1765ff",
                backgroundColor: "rgba(23, 101, 255, 0.12)",
                borderWidth: 3,
                pointRadius: 5,
                pointBackgroundColor: "#1765ff",
                tension: 0.2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Head Movement Step"
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "Cylinder Number"
                    }
                }
            }
        }
    });
}

// ========================================
// 14. COMPARE ALL ALGORITHMS
// ========================================
function compareAlgorithms(data) {
    return ALGORITHMS.map(algorithm => ({
        algorithm,
        result: runAlgorithm(algorithm, data)
    }));
}

function displayComparisonTable(comparisonResults) {
    comparisonTableBody.innerHTML = comparisonResults
        .map(item => `
            <tr>
                <td>${item.algorithm}</td>
                <td>${item.result.totalMovement}</td>
                <td>${item.result.averageMovement.toFixed(2)}</td>
                <td>${item.result.steps}</td>
            </tr>
        `)
        .join("");
}

function createComparisonChart(comparisonResults) {
    const canvas = document.getElementById("comparisonChart");

    if (comparisonChart) {
        comparisonChart.destroy();
    }

    comparisonChart = new Chart(canvas, {
        type: "bar",
        data: {
            labels: comparisonResults.map(item => item.algorithm),
            datasets: [{
                label: "Total Head Movement",
                data: comparisonResults.map(item => item.result.totalMovement),
                backgroundColor: [
                    "#1765ff", "#20bd75", "#f59e0b",
                    "#8b5cf6", "#ec4899", "#06b6d4"
                ],
                borderRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "Total Head Movement (cylinders)"
                    }
                }
            }
        }
    });
}

// ========================================
// 15. PERFORMANCE INSIGHTS
// ========================================
function displayPerformanceInsights(comparisonResults) {
    const sortedResults = [...comparisonResults].sort(
        (a, b) => a.result.totalMovement - b.result.totalMovement
    );

    const best = sortedResults[0];
    const worst = sortedResults[sortedResults.length - 1];

    bestAlgorithmOutput.textContent =
        best.algorithm + " (" + best.result.totalMovement + ")";

    insightText.textContent =
        best.algorithm + " gives the lowest head movement (" +
        best.result.totalMovement + " cylinders) for the current input. " +
        worst.algorithm + " gives the highest movement (" +
        worst.result.totalMovement + " cylinders). Results can change " +
        "when the request queue, initial head position, or direction changes.";
}

// ========================================
// 16. RUN BUTTON
// ========================================
runBtn.addEventListener("click", function () {
    const data = getUserInputs();
    const error = validateInputs(data);

    if (error) {
        message.textContent = error;
        message.style.color = "#dc2626";
        return;
    }

    try {
        const selectedResult = runAlgorithm(data.algorithm, data);

        // Run every algorithm using the same disk input for comparison.
        const comparisonResults = compareAlgorithms(data);

        displayMainResults(selectedResult, data.requests.length);
        displayMovementTable(selectedResult.sequence);
        createMovementChart(selectedResult.sequence);

        displayComparisonTable(comparisonResults);
        createComparisonChart(comparisonResults);
        displayPerformanceInsights(comparisonResults);

        message.textContent = data.algorithm + " simulation completed successfully!";
        message.style.color = "#15965b";
    } catch (error) {
        message.textContent = "Unable to run simulation: " + error.message;
        message.style.color = "#dc2626";
    }
});

// ========================================
// 17. RESET BUTTON
// ========================================
resetBtn.addEventListener("click", function () {
    diskSizeInput.value = 200;
    headPositionInput.value = 53;
    requestsInput.value = "";
    algorithmInput.value = "FCFS";
    directionInput.value = "right";

    message.textContent = "";

    totalMovementOutput.textContent = "--";
    processedRequestsOutput.textContent = "--";
    averageMovementOutput.textContent = "--";
    bestAlgorithmOutput.textContent = "--";
    sequenceOutput.textContent = "Run a simulation to see the execution sequence.";

    processedCountOutput.textContent = "0";
    totalStepsOutput.textContent = "0";

    movementTableBody.innerHTML =
        '<tr><td colspan="4">Run simulation to see results.</td></tr>';

    comparisonTableBody.innerHTML =
        '<tr><td colspan="4">Run simulation to see comparison results.</td></tr>';

    insightText.textContent =
        "Run an algorithm comparison to generate performance insights.";

    if (movementChart) {
        movementChart.destroy();
        movementChart = null;
    }

    if (comparisonChart) {
        comparisonChart.destroy();
        comparisonChart = null;
    }
});