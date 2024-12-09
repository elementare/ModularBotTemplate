import fs from 'fs-extra';
import path from 'path';

const NODE_MODULES = path.join(import.meta.dirname, 'node_modules');
const MODULES_DIR = path.join(import.meta.dirname, 'modules');
const SCOPES = ['@plarywastaken']; // Define the scopes to handle

function moveScopedModules() {
    SCOPES.forEach((scope) => {
        const scopeDir = path.join(NODE_MODULES, scope);

        if (fs.existsSync(scopeDir)) {
            const modules = fs.readdirSync(scopeDir);
            modules.forEach((module) => {
                const source = path.join(scopeDir, module);
                const destination = path.join(MODULES_DIR, module);

                // Ensure destination directory exists
                fs.ensureDirSync(MODULES_DIR);
                try {
                    const rootPackage = fs.readJSONSync(path.join(source, "package.json"), {throws: false});
                    const destDir = fs.readdirSync(destination);
                    const forceUpdate = process.argv.includes("-f");
                    const forceDisabled = process.argv.includes("-d");
                    if (destDir.length > 0) {
                        for (const file of destDir) {
                            if (file === "manifest.json") {
                                const manifest = fs.readJSONSync(path.join(destination, file), {throws: false});
                                const packageJson = fs.readJSONSync(path.join(destination, "package.json"), {throws: false});
                                if (manifest && manifest.disabled === true && !forceDisabled) {
                                    console.log(`Module ${module} is disabled, skipping`);
                                    return;
                                }
                                if (packageJson && packageJson.version ===  rootPackage.version && !forceUpdate) {
                                    console.log(`Module ${module} is up to date, skipping`);
                                    return;
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.log(`Couldn't find module ${module} in destination, copying`);
                }



                // Move the module's source code to the modules directory
                console.log(`Moving ${scope}/${module} to ${destination}`);
                fs.removeSync(destination); // Clean up old version
                fs.copySync(source, destination); // Copy new version

            });
        }
    });
}
moveScopedModules();
