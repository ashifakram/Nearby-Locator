import db from '../db.js';

class QueueRepository {
  async recordJob(jobType, queueName = 'high', payload = null, status = 'PENDING') {
    const [inserted] = await db('queue_job_history')
      .insert({
        job_type: jobType,
        queue_name: queueName,
        status,
        payload: payload ? JSON.stringify(payload) : null,
        created_at: new Date()
      })
      .returning('*');
    return inserted;
  }

  async updateJobStatus(jobId, status, errorStack = null) {
    const updateData = {
      status,
      updated_at: new Date()
    };
    if (status === 'COMPLETED' || status === 'FAILED') {
      updateData.completed_at = new Date();
    }
    if (errorStack) {
      updateData.error_stack = errorStack;
    }

    const [updated] = await db('queue_job_history')
      .where({ id: jobId })
      .increment('attempts', 1)
      .update(updateData)
      .returning('*');
    return updated;
  }

  async getJobs({ status, queueName, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    let query = db('queue_job_history');

    if (status) {
      query = query.where({ status });
    }
    if (queueName) {
      query = query.where({ queue_name: queueName });
    }

    const [totalResult, records] = await Promise.all([
      query.clone().count('* as total').first(),
      query.clone()
        .select('id', 'job_type', 'queue_name', 'status', 'attempts', 'error_stack', 'payload', 'created_at', 'completed_at')
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset)
    ]);

    const total = parseInt(totalResult?.total || 0, 10);
    return {
      records,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getJobById(jobId) {
    return await db('queue_job_history')
      .where({ id: jobId })
      .first();
  }

  async deleteJob(jobId) {
    return await db('queue_job_history')
      .where({ id: jobId })
      .del();
  }

  async getFailedDlqCount() {
    const result = await db('queue_job_history')
      .where({ status: 'FAILED' })
      .count('* as total')
      .first();
    return parseInt(result?.total || 0, 10);
  }
}

export default new QueueRepository();
