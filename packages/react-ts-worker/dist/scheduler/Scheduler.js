import { ImmediatePriority, UserBlockingPriority, NormalPriority, LowPriority, IdlePriority, IMMEDIATE_PRIORITY_TIMEOUT, USER_BLOCKING_PRIORITY_TIMEOUT, NORMAL_PRIORITY_TIMEOUT, LOW_PRIORITY_TIMEOUT, IDLE_PRIORITY_TIMEOUT, } from './SchedulerPriorities.js';
import { push, pop, peek } from './SchedulerMinHeap.js';
// Time utilities
let getCurrentTime;
const hasPerformanceNow = typeof performance === 'object' && typeof performance.now === 'function';
if (hasPerformanceNow) {
    const localPerformance = performance;
    getCurrentTime = () => localPerformance.now();
}
else {
    const localDate = Date;
    const initialTime = localDate.now();
    getCurrentTime = () => localDate.now() - initialTime;
}
// Frame yield budget (5ms)
const frameYieldMs = 5;
// Task queues stored as min heaps
const taskQueue = [];
const timerQueue = [];
// Incrementing id counter. Used to maintain insertion order.
let taskIdCounter = 1;
let currentTask = null;
let currentPriorityLevel = NormalPriority;
// This is set while performing work, to prevent re-entrance.
let isPerformingWork = false;
let isHostCallbackScheduled = false;
let isHostTimeoutScheduled = false;
// Capture local references to native APIs
const localSetTimeout = typeof setTimeout === 'function' ? setTimeout : null;
const localClearTimeout = typeof clearTimeout === 'function' ? clearTimeout : null;
function advanceTimers(currentTime) {
    // Check for tasks that are no longer delayed and add them to the queue.
    let timer = peek(timerQueue);
    while (timer !== null) {
        if (timer.callback === null) {
            // Timer was cancelled.
            pop(timerQueue);
        }
        else if (timer.startTime <= currentTime) {
            // Timer fired. Transfer to the task queue.
            pop(timerQueue);
            timer.sortIndex = timer.expirationTime;
            push(taskQueue, timer);
        }
        else {
            // Remaining timers are pending.
            return;
        }
        timer = peek(timerQueue);
    }
}
function handleTimeout(currentTime) {
    isHostTimeoutScheduled = false;
    advanceTimers(currentTime);
    if (!isHostCallbackScheduled) {
        if (peek(taskQueue) !== null) {
            isHostCallbackScheduled = true;
            requestHostCallback();
        }
        else {
            const firstTimer = peek(timerQueue);
            if (firstTimer !== null) {
                requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
            }
        }
    }
}
function flushWork(initialTime) {
    // We'll need a host callback the next time work is scheduled.
    isHostCallbackScheduled = false;
    if (isHostTimeoutScheduled) {
        // We scheduled a timeout but it's no longer needed. Cancel it.
        isHostTimeoutScheduled = false;
        cancelHostTimeout();
    }
    isPerformingWork = true;
    const previousPriorityLevel = currentPriorityLevel;
    try {
        return workLoop(initialTime);
    }
    finally {
        currentTask = null;
        currentPriorityLevel = previousPriorityLevel;
        isPerformingWork = false;
    }
}
function workLoop(initialTime) {
    let currentTime = initialTime;
    advanceTimers(currentTime);
    currentTask = peek(taskQueue);
    while (currentTask !== null) {
        if (currentTask.expirationTime > currentTime && shouldYieldToHost()) {
            // This currentTask hasn't expired, and we've reached the deadline.
            break;
        }
        const callback = currentTask.callback;
        if (typeof callback === 'function') {
            currentTask.callback = null;
            currentPriorityLevel = currentTask.priorityLevel;
            const didUserCallbackTimeout = currentTask.expirationTime <= currentTime;
            const continuationCallback = callback(didUserCallbackTimeout);
            currentTime = getCurrentTime();
            if (typeof continuationCallback === 'function') {
                // If a continuation is returned, immediately yield to the main thread
                currentTask.callback = continuationCallback;
                advanceTimers(currentTime);
                return true;
            }
            else {
                if (currentTask === peek(taskQueue)) {
                    pop(taskQueue);
                }
                advanceTimers(currentTime);
            }
        }
        else {
            pop(taskQueue);
        }
        currentTask = peek(taskQueue);
    }
    // Return whether there's additional work
    if (currentTask !== null) {
        return true;
    }
    else {
        const firstTimer = peek(timerQueue);
        if (firstTimer !== null) {
            requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
        }
        return false;
    }
}
// --- Host config: MessageChannel-based scheduling ---
let isMessageLoopRunning = false;
let taskTimeoutID = -1;
let frameInterval = frameYieldMs;
let startTime = -1;
function shouldYieldToHost() {
    const timeElapsed = getCurrentTime() - startTime;
    if (timeElapsed < frameInterval) {
        return false;
    }
    return true;
}
const performWorkUntilDeadline = () => {
    if (isMessageLoopRunning) {
        const currentTime = getCurrentTime();
        startTime = currentTime;
        let hasMoreWork = true;
        try {
            hasMoreWork = flushWork(currentTime);
        }
        finally {
            if (hasMoreWork) {
                schedulePerformWorkUntilDeadline();
            }
            else {
                isMessageLoopRunning = false;
            }
        }
    }
};
let schedulePerformWorkUntilDeadline;
if (typeof MessageChannel !== 'undefined') {
    // DOM and Worker environments.
    // We prefer MessageChannel because of the 4ms setTimeout clamping.
    const channel = new MessageChannel();
    const port = channel.port2;
    channel.port1.onmessage = performWorkUntilDeadline;
    schedulePerformWorkUntilDeadline = () => {
        port.postMessage(null);
    };
}
else {
    // Fallback to setTimeout in non-browser environments.
    schedulePerformWorkUntilDeadline = () => {
        localSetTimeout(performWorkUntilDeadline, 0);
    };
}
function requestHostCallback() {
    if (!isMessageLoopRunning) {
        isMessageLoopRunning = true;
        schedulePerformWorkUntilDeadline();
    }
}
function requestHostTimeout(callback, ms) {
    taskTimeoutID = localSetTimeout(() => {
        callback(getCurrentTime());
    }, ms);
}
function cancelHostTimeout() {
    localClearTimeout(taskTimeoutID);
    taskTimeoutID = -1;
}
// --- Public API ---
export function scheduleCallback(priorityLevel, callback, options) {
    const currentTime = getCurrentTime();
    let taskStartTime;
    if (typeof options === 'object' && options !== null) {
        const delay = options.delay;
        if (typeof delay === 'number' && delay > 0) {
            taskStartTime = currentTime + delay;
        }
        else {
            taskStartTime = currentTime;
        }
    }
    else {
        taskStartTime = currentTime;
    }
    let timeout;
    switch (priorityLevel) {
        case ImmediatePriority:
            timeout = IMMEDIATE_PRIORITY_TIMEOUT;
            break;
        case UserBlockingPriority:
            timeout = USER_BLOCKING_PRIORITY_TIMEOUT;
            break;
        case IdlePriority:
            timeout = IDLE_PRIORITY_TIMEOUT;
            break;
        case LowPriority:
            timeout = LOW_PRIORITY_TIMEOUT;
            break;
        case NormalPriority:
        default:
            timeout = NORMAL_PRIORITY_TIMEOUT;
            break;
    }
    const expirationTime = taskStartTime + timeout;
    const newTask = {
        id: taskIdCounter++,
        callback,
        priorityLevel,
        startTime: taskStartTime,
        expirationTime,
        sortIndex: -1,
    };
    if (taskStartTime > currentTime) {
        // This is a delayed task.
        newTask.sortIndex = taskStartTime;
        push(timerQueue, newTask);
        if (peek(taskQueue) === null && newTask === peek(timerQueue)) {
            // All tasks are delayed, and this is the task with the earliest delay.
            if (isHostTimeoutScheduled) {
                cancelHostTimeout();
            }
            else {
                isHostTimeoutScheduled = true;
            }
            requestHostTimeout(handleTimeout, taskStartTime - currentTime);
        }
    }
    else {
        newTask.sortIndex = expirationTime;
        push(taskQueue, newTask);
        // Schedule a host callback, if needed.
        if (!isHostCallbackScheduled && !isPerformingWork) {
            isHostCallbackScheduled = true;
            requestHostCallback();
        }
    }
    return newTask;
}
export function cancelCallback(task) {
    task.callback = null;
}
export function shouldYield() {
    return shouldYieldToHost();
}
export function getCurrentPriorityLevel() {
    return currentPriorityLevel;
}
export function forceFrameRate(fps) {
    if (fps < 0 || fps > 125) {
        console.error('forceFrameRate takes a positive int between 0 and 125, ' +
            'forcing frame rates higher than 125 fps is not supported');
        return;
    }
    if (fps > 0) {
        frameInterval = Math.floor(1000 / fps);
    }
    else {
        frameInterval = frameYieldMs;
    }
}
export { getCurrentTime, ImmediatePriority, UserBlockingPriority, NormalPriority, LowPriority, IdlePriority };
//# sourceMappingURL=Scheduler.js.map