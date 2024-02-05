// writing utility function for async operations

/* // 1. with async await
const asyncHandler = (requestHandler) => async (req, res, next) => {
    try {
        await requestHandler(req, res, next)
    } catch (error) {
      res.status(error.code || 500).json({
        success: false,
        mssg: error.message,
      });
    }
}; */

/* const asyncHandlerSyntaxExplained = (requestHandler) => {
    async (req, res, next) => {
      try {
          await requestHandler(req, res, next)
      } catch (error) {
        res.status(error.code || 500).json({
          success: false,
          mssg: error.message,
        });
      }
    };
  }; */

// 2. with promise
const asyncHandler = (requestHandler) => {
  return async (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };
