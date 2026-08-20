const logger = require("../utils/logger");

const queue = [];
let processing = false;

const addJob = (name, data, taskFn) => {
  logger.info(`Adding background job to queue: ${name}`, { name });
  queue.push({ name, data, taskFn, addedAt: new Date() });
  triggerWorker();
};

const triggerWorker = async () => {
  if (processing || queue.length === 0) return;
  processing = true;

  const job = queue.shift();
  logger.info(`Starting job execution: ${job.name}`, { name: job.name });
  
  try {
    const startTime = Date.now();
    await job.taskFn(job.data);
    const duration = Date.now() - startTime;
    logger.info(`Job completed successfully: ${job.name}`, { name: job.name, durationMs: duration });
  } catch (err) {
    logger.error(`Job failed with error: ${job.name} - ${err.message}`, { name: job.name, stack: err.stack });
  } finally {
    processing = false;
    // Process next item in the queue asynchronously
    setTimeout(triggerWorker, 50);
  }
};

module.exports = {
  addJob,
  getQueueSize: () => queue.length,
  isProcessing: () => processing
};
