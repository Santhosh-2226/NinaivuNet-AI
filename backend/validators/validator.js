const { z } = require("zod");
const { AppError } = require("../middleware/errorMiddleware");

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
      const issues = err.errors || err.issues || [];
      const details = issues.map(e => `${e.path.join(".")}: ${e.message}`).join(", ");
      next(new AppError(`Validation failed: ${details}`, 400));
    }
  };
};

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Valid email is required"),
    password: z.string().min(6, "Password must be at least 6 characters")
  })
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Valid email is required"),
    password: z.string().min(1, "Password is required")
  })
});

module.exports = {
  validate,
  registerSchema,
  loginSchema
};
