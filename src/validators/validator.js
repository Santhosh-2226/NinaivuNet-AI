const { z } = require("zod");
const { AppError } = require("../middlewares/errorMiddleware");

const validate = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (err) {
      const issues = err.issues || err.errors || [];
      const details = issues.length > 0
        ? issues.map(e => `${(e.path || []).join(".")}: ${e.message}`).join(", ")
        : err.message;
      next(new AppError(`Validation failed: ${details}`, 400));
    }
  };
};

const meetingStartSchema = z.object({
  params: z.object({
    meetingId: z.string().min(1),
    userId: z.string().min(1)
  }),
  body: z.object({
    userName: z.string().min(1),
    startedAtMs: z.number().positive()
  })
});

const reminderSchema = z.object({
  params: z.object({
    meetingId: z.string().min(1)
  }),
  body: z.object({
    projectId: z.string().min(1),
    userName: z.string().min(1),
    memberEmails: z.record(z.string().email()).optional(),
    creatorEmail: z.string().email().optional()
  })
});

const translateRequestSchema = z.object({
  body: z.object({
    text: z.string().min(1),
    targetLanguage: z.string().length(2).optional()
  })
});

const emailDraftSchema = z.object({
  params: z.object({
    meetingId: z.string().min(1)
  }),
  body: z.object({
    projectId: z.string().min(1),
    userName: z.string().min(1),
    preferredLanguage: z.string().optional()
  })
});

const meetingPrepSchema = z.object({
  params: z.object({
    projectId: z.string().min(1)
  }),
  body: z.object({
    userName: z.string().min(1)
  })
});

const whiteboardSchema = z.object({
  params: z.object({
    meetingId: z.string().min(1)
  }),
  body: z.object({
    drawingPoints: z.array(z.any())
  })
});

const executiveCopilotSchema = z.object({
  body: z.object({
    question: z.string().min(1)
  })
});

const ragQuerySchema = z.object({
  body: z.object({
    question: z.string().min(1),
    projectId: z.string().optional(),
    preferredLanguage: z.string().optional()
  })
});

module.exports = {
  validate,
  meetingStartSchema,
  reminderSchema,
  translateRequestSchema,
  emailDraftSchema,
  meetingPrepSchema,
  whiteboardSchema,
  executiveCopilotSchema,
  ragQuerySchema
};
