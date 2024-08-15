import { execa } from 'execa';
import { parseConfig } from './config';

async function publish(pluginConfig, context) {
    const { logger, nextRelease } = context;

    // Parse configuration
    const config = parseConfig(pluginConfig);

    if (!config.image || !config.registry) {
        throw new Error('Both image and registry must be specified.');
    }

    for (const tag of config.tags) {
        const tagName = `${config.image}:${tag === '${version}' ? nextRelease.version : tag}`;
        const fullUri = `${config.registry}/${tagName}`;

        logger.log(`Building and pushing Docker image: ${fullUri}`);

        try {
            const kanikoArgs = [
                '--dockerfile',
                config.dockerfile,
                '--context',
                '.',
                '--destination',
                fullUri
            ];

            if (config.target) kanikoArgs.push('--target', config.target); // Add target if specified
            if (config.insecure) kanikoArgs.push('--insecure');            
            if (config.cache) kanikoArgs.push('--cache'); // Enable cache if specified
            if (config.cacheTTL) kanikoArgs.push('--cache-ttl', config.cacheTTL); // Set cache TTL if specified
            if (config.kanikoDir) kanikoArgs.push('--kaniko-dir', config.kanikoDir); // Set an alternative staging folder for Kaniko

            const env = {};
            if (config.username) env.DOCKER_USERNAME = config.username;
            if (config.password) env.DOCKER_PASSWORD = config.password;

            await execa('/kaniko/executor', kanikoArgs, { env });
            logger.log(`Successfully built and pushed image: ${fullUri}`);
        } catch (error) {
            logger.error(`Failed to build and push image: ${fullUri}`);
            throw error;
        }
    }

    logger.log('Docker image publishing complete.');
}

export { publish };
