import morgan from 'morgan';

/**
 * HTTP request logger.
 * Uses 'dev' format in development (coloured, concise) and
 * 'combined' (Apache-style) in production so log aggregators can parse it.
 */
const format = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';

const requestLogger = morgan(format);

export default requestLogger;
