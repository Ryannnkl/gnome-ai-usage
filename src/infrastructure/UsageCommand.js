import Gio from 'gi://Gio';
import {UsageError} from '../domain/UsageError.js';

export class UsageCommand {
    run(executable, arguments_, cancellable, environment = {}) {
        if (cancellable.is_cancelled())
            return Promise.reject(new UsageError('network'));
        let process;
        try {
            const launcher = new Gio.SubprocessLauncher({flags:
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE});
            launcher.setenv('LC_ALL', 'C', true);
            this.applyEnvironment(launcher, environment);
            process = launcher.spawnv([executable, ...arguments_]);
        } catch {
            return Promise.reject(new UsageError('unavailable'));
        }
        return this.communicate(process, cancellable);
    }

    applyEnvironment(launcher, environment) {
        for (const [name, value] of Object.entries(environment)) {
            if (value === null)
                launcher.unsetenv(name);
            else
                launcher.setenv(name, value, true);
        }
    }

    communicate(process, cancellable) {
        const cancelSignal = cancellable.connect(() => process.force_exit());
        return new Promise((resolve, reject) => {
            process.communicate_utf8_async(null, cancellable, (source, result) => {
                cancellable.disconnect(cancelSignal);
                try {
                    const [, stdout, stderr] = source.communicate_utf8_finish(result);
                    if (!source.get_successful())
                        throw this.failure(`${stderr}\n${stdout}`);
                    if (stdout.length > 128 * 1024)
                        throw new UsageError('invalidResponse');
                    if (this.needsAuthentication(stdout))
                        throw new UsageError('needsAuth');
                    resolve(stdout);
                } catch (error) {
                    reject(error instanceof UsageError ? error : new UsageError('network'));
                }
            });
        });
    }

    failure(stderr) {
        if (this.needsAuthentication(stderr))
            return new UsageError('needsAuth');
        if (/permission denied|keyring.*(?:locked|denied)/i.test(stderr))
            return new UsageError('accessDenied');
        return new UsageError('network');
    }

    needsAuthentication(output) {
        return /auth(?:entication)? required|sign.?in required|not authenticated|not logged in|please run \/login/i.test(output);
    }
}
