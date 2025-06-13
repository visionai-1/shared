"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logging = void 0;
// logging.ts
const winston_1 = __importDefault(require("winston"));
/**
 * Enhanced Winston Logger with Colors and Production-Ready Configuration
 * Based on Winston best practices: https://github.com/winstonjs/winston
 */
const { combine, timestamp, printf, errors, splat, json } = winston_1.default.format;
// ANSI color codes for direct terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m'
};
// Level to color mapping
const levelColors = {
    error: colors.red,
    warn: colors.yellow,
    info: colors.cyan,
    http: colors.magenta,
    verbose: colors.blue,
    debug: colors.green,
    silly: colors.white
};
// Custom format for console output with emojis and colors
const consoleFormat = printf(({ level, message, timestamp, stack, service, ...meta }) => {
    const emoji = getLogEmoji(level);
    const color = levelColors[level] || colors.white;
    const coloredLevel = `${color}${level.toUpperCase()}${colors.reset}`;
    const coloredTime = `${colors.gray}${timestamp}${colors.reset}`;
    // Clean up metadata - only show meaningful information
    const filteredMeta = { ...meta };
    // Remove default/common fields that clutter the output
    delete filteredMeta.environment;
    delete filteredMeta.service;
    delete filteredMeta.type;
    // Only show essential metadata if it exists and is meaningful
    const essentialMeta = {};
    if (filteredMeta.error)
        essentialMeta.error = filteredMeta.error;
    if (filteredMeta.userId)
        essentialMeta.userId = filteredMeta.userId;
    if (filteredMeta.ip)
        essentialMeta.ip = filteredMeta.ip;
    if (filteredMeta.method && filteredMeta.url) {
        essentialMeta.request = `${filteredMeta.method} ${filteredMeta.url}`;
    }
    if (filteredMeta.statusCode)
        essentialMeta.status = filteredMeta.statusCode;
    if (filteredMeta.duration || filteredMeta.responseTime) {
        essentialMeta.time = filteredMeta.duration || filteredMeta.responseTime;
    }
    // Show metadata only if there's something meaningful to show
    const metaStr = Object.keys(essentialMeta).length > 0 ?
        ` ${colors.gray}[${Object.entries(essentialMeta).map(([k, v]) => `${k}: ${v}`).join(', ')}]${colors.reset}` : '';
    const messageContent = stack || message;
    const coloredMessage = `${color}${messageContent}${colors.reset}`;
    return `${emoji} ${coloredTime} ${coloredLevel}: ${coloredMessage}${metaStr}`;
});
// Custom format for file output (structured JSON)
const fileFormat = combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), splat(), json());
// Get emoji for log level with enhanced visual mapping
function getLogEmoji(level) {
    const emojis = {
        error: '🚨', // Red siren for errors
        warn: '⚠️', // Warning sign
        info: '💡', // Light bulb for information
        http: '🌐', // Globe for HTTP requests
        verbose: '📝', // Memo for verbose logs
        debug: '🔍', // Magnifying glass for debugging
        silly: '🎭', // Theater masks for silly
        // Special category emojis
        auth: '🔐', // Lock for authentication
        database: '🗄️', // File cabinet for database
        email: '📧', // Email for email operations
        performance: '⚡', // Lightning for performance
        security: '🛡️', // Shield for security
        api: '🔌', // Plug for API calls
        config: '⚙️', // Gear for configuration
        startup: '🚀', // Rocket for startup
        shutdown: '🛑' // Stop sign for shutdown
    };
    return emojis[level] || '📌';
}
// Create logger with environment-specific configuration
const createLogger = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const isDevelopment = process.env.NODE_ENV === 'local' || process.env.NODE_ENV === 'development';
    // If NODE_ENV is not set, default to development behavior for better terminal display
    const isDefaultEnv = !process.env.NODE_ENV;
    const transports = [];
    // Console transport - ALWAYS enabled for terminal display
    // Enhanced for better visibility in terminal
    if (!isProduction || isDefaultEnv) {
        transports.push(new winston_1.default.transports.Console({
            level: 'debug',
            handleExceptions: true,
            handleRejections: true,
            stderrLevels: ['error'],
            format: combine(timestamp({ format: 'HH:mm:ss' }), errors({ stack: true }), splat(), consoleFormat),
        }));
    }
    else {
        // Production console transport (structured but still visible)
        transports.push(new winston_1.default.transports.Console({
            level: 'info',
            handleExceptions: true,
            handleRejections: true,
            format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), printf(({ level, message, timestamp, stack, ...meta }) => {
                const emoji = getLogEmoji(level);
                const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
                return `${emoji} [${timestamp}] ${level.toUpperCase()}: ${stack || message}${metaStr}`;
            })),
        }));
    }
    // File transports for persistent logging (only in dev/prod environments)
    if (isDevelopment || isProduction) {
        // Error logs file
        transports.push(new winston_1.default.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: fileFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 10,
        }));
        // Combined logs file
        transports.push(new winston_1.default.transports.File({
            filename: 'logs/combined.log',
            format: fileFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 10,
        }));
        // HTTP logs file for API requests
        transports.push(new winston_1.default.transports.File({
            filename: 'logs/http.log',
            level: 'http',
            format: fileFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }));
    }
    return winston_1.default.createLogger({
        level: isProduction ? 'info' : 'debug',
        defaultMeta: {
            service: 'node-typescript-boilerplate',
            environment: process.env.NODE_ENV || 'development'
        },
        transports,
        // Handle exceptions and rejections
        exceptionHandlers: isProduction ? [
            new winston_1.default.transports.File({ filename: 'logs/exceptions.log' })
        ] : [],
        rejectionHandlers: isProduction ? [
            new winston_1.default.transports.File({ filename: 'logs/rejections.log' })
        ] : [],
        exitOnError: false, // Don't exit on handled exceptions
    });
};
const logger = createLogger();
// Enhanced Logging class with more methods and better error handling
class Logging {
}
exports.Logging = Logging;
_a = Logging;
/**
 * Generic log method
 */
Logging.log = (level, message, meta) => {
    logger.log(level, message, meta);
};
/**
 * Info level logging - general information
 */
Logging.info = (message, meta) => {
    if (message instanceof Error) {
        logger.info(message.message, { stack: message.stack, ...meta });
    }
    else if (typeof message === 'string') {
        logger.info(message, meta);
    }
    else {
        logger.info(JSON.stringify(message), meta);
    }
};
/**
 * Warning level logging - potential issues
 */
Logging.warn = (message, meta) => {
    if (message instanceof Error) {
        logger.warn(message.message, { stack: message.stack, ...meta });
    }
    else if (typeof message === 'string') {
        logger.warn(message, meta);
    }
    else {
        logger.warn(JSON.stringify(message), meta);
    }
};
/**
 * Error level logging - errors and exceptions
 */
Logging.error = (message, meta) => {
    if (message instanceof Error) {
        logger.error(message.message, { stack: message.stack, ...meta });
    }
    else if (typeof message === 'string') {
        logger.error(message, meta);
    }
    else {
        logger.error(JSON.stringify(message), meta);
    }
};
/**
 * Debug level logging - detailed debugging information
 */
Logging.debug = (message, meta) => {
    if (message instanceof Error) {
        logger.debug(message.message, { stack: message.stack, ...meta });
    }
    else if (typeof message === 'string') {
        logger.debug(message, meta);
    }
    else {
        logger.debug(JSON.stringify(message), meta);
    }
};
/**
 * HTTP level logging - for API requests and responses
 */
Logging.http = (message, meta) => {
    logger.http(message, meta);
};
/**
 * Verbose level logging - detailed operational information
 */
Logging.verbose = (message, meta) => {
    logger.verbose(message, meta);
};
/**
 * Silly level logging - very detailed debugging
 */
Logging.silly = (message, meta) => {
    logger.silly(message, meta);
};
/**
 * Performance profiling
 */
Logging.profile = (id, meta) => {
    logger.profile(id, meta);
};
/**
 * Start a timer for performance measurement
 */
Logging.startTimer = () => {
    return logger.startTimer();
};
/**
 * Log database operations
 */
Logging.database = (operation, details) => {
    logger.info(`🗄️ Database: ${operation}`, {
        type: 'database',
        operation,
        ...details
    });
};
/**
 * Log authentication events
 */
Logging.auth = (event, details) => {
    logger.info(`🔐 Auth: ${event}`, {
        type: 'authentication',
        event,
        ...details
    });
};
/**
 * Log email events
 */
Logging.email = (event, details) => {
    logger.info(`📧 Email: ${event}`, {
        type: 'email',
        event,
        ...details
    });
};
/**
 * Log API requests (middleware helper)
 */
Logging.request = (method, url, statusCode, responseTime, ip) => {
    const level = statusCode && statusCode >= 400 ? 'warn' : 'http';
    logger.log(level, `${method} ${url}`, {
        type: 'request',
        method,
        url,
        statusCode,
        responseTime: responseTime ? `${responseTime}ms` : undefined,
        ip
    });
};
/**
 * Get the underlying Winston logger instance
 */
Logging.getLogger = () => logger;
/**
 * Startup and configuration logging
 */
Logging.startup = (message, meta) => {
    logger.info(`🚀 Startup: ${message}`, {
        type: 'startup',
        ...meta
    });
};
/**
 * Performance and metrics logging
 */
Logging.performance = (message, meta) => {
    logger.info(`⚡ Performance: ${message}`, {
        type: 'performance',
        ...meta
    });
};
/**
 * Security-related logging
 */
Logging.security = (message, meta) => {
    logger.warn(`🛡️ Security: ${message}`, {
        type: 'security',
        ...meta
    });
};
/**
 * API operation logging
 */
Logging.api = (message, meta) => {
    logger.info(`🔌 API: ${message}`, {
        type: 'api',
        ...meta
    });
};
/**
 * Configuration logging
 */
Logging.config = (message, meta) => {
    logger.info(`⚙️ Config: ${message}`, {
        type: 'config',
        ...meta
    });
};
/**
 * Shutdown logging
 */
Logging.shutdown = (message, meta) => {
    logger.info(`🛑 Shutdown: ${message}`, {
        type: 'shutdown',
        ...meta
    });
};
/**
 * Display a beautiful startup banner in terminal
 */
Logging.banner = (appName, version, port) => {
    const banner = [
        '',
        '╔══════════════════════════════════════════════════════════════╗',
        '║                                                              ║',
        `║  🚀 ${appName.padEnd(50)} 🚀  ║`,
        version ? `║     Version: ${version.padEnd(43)} ║` : '',
        port ? `║     Port: ${port.toString().padEnd(46)} ║` : '',
        '║                                                              ║',
        '║  Ready to handle requests! 💪                                ║',
        '║                                                              ║',
        '╚══════════════════════════════════════════════════════════════╝',
        ''
    ].filter(line => line !== '');
    // Log each line of the banner with cyan color
    banner.forEach(line => {
        console.log(`${colors.cyan}${line}${colors.reset}`);
    });
    // Also log to file if configured
    _a.startup(`Application started: ${appName}`, { version, port });
};
/**
 * Clear terminal and show fresh start
 */
Logging.clearAndStart = (message) => {
    // Clear terminal
    console.clear();
    // Show fresh start message
    console.log(`${colors.green}🔄 Starting fresh...${colors.reset}\n`);
    if (message) {
        _a.info(message);
    }
};
/**
 * Log colorful separator for better readability
 */
Logging.separator = (label) => {
    const sep = '═'.repeat(60);
    const message = label ? `═══ ${label} ═══` : sep;
    console.log(`${colors.gray}${message}${colors.reset}`);
};
/**
 * Force immediate console output (useful for debugging)
 */
Logging.forceOutput = (message, color = 'cyan') => {
    const colorCode = colors[color] || colors.cyan;
    console.log(`${colorCode}${message}${colors.reset}`);
    // Also log normally
    _a.info(message);
};
