/*
 * Copyright 2019 Google Inc. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const {promisify} = require('util');
const exec = promisify(require('child_process').exec);
const util = require('../util');

const BUILD_TOOLS_VERSION = '29.0.2';

class AndroidSdkTools {
  constructor(process, config, jdkHelper) {
    this.process = process;
    this.config = config;
    this.jdkHelper = jdkHelper;
    if (this.process.platform === 'win32') {
      this.pathJoin = path.win32.join;
    } else {
      this.pathJoin = path.posix.join;
    }
  }

  // Runs <path-to-sdk-tools>/tools/bin/sdkmanager --install "build-tools;29.0.2"
  async installBuildTools() {
    const env = this.getEnv();

    console.log('Installing Build Tools');
    await util.execInteractive(
        this.pathJoin(this.getAndroidHome(), '/tools/bin/sdkmanager'),
        ['--install',
          `"build-tools;${BUILD_TOOLS_VERSION}"`],
        env,
    );
  }

  async checkBuildTools() {
    const buildToolsPath =
        this.pathJoin(this.getAndroidHome(), '/build-tools/', BUILD_TOOLS_VERSION);
    return fs.existsSync(buildToolsPath);
  }

  async writeLicenseFile() {
    const licensesPath = this.pathJoin(this.getAndroidHome(), '/licenses/');
    await fs.promises.mkdir(licensesPath, {recursive: true});
    const androidSdkLicenseFile = this.pathJoin(licensesPath, '/android-sdk-license');
    await fs.promises.writeFile(androidSdkLicenseFile, '24333f8a63b6825ea9c5514f83c2829b004d1fee');
  }

  getAndroidHome() {
    return this.pathJoin(this.config.androidSdkPath, '/');
  }

  getEnv() {
    const env = this.jdkHelper.getEnv();
    env['ANDROID_HOME'] = this.getAndroidHome();
    return env;
  }

  async zipalign(input, output) {
    const env = this.getEnv();
    const zipalignCmd = [
      `"${this.pathJoin(this.getAndroidHome(), '/build-tools/29.0.2/zipalign')}"`,
      '-v -f -p 4',
      input,
      output,
    ];
    await exec(zipalignCmd.join(' '), {env: env});
  }

  async apksigner(keystore, ksPass, alias, keyPass, input, output) {
    const env = this.getEnv();
    const apksignerCmd = [
      `"${this.pathJoin(this.getAndroidHome(), '/build-tools/29.0.2/apksigner')}"`,
      `sign --ks ${keystore}`,
      `--ks-key-alias ${alias}`,
      `--ks-pass pass:${ksPass}`,
      `--key-pass pass:${keyPass}`,
      `--out ${output}`,
      input,
    ];
    await exec(apksignerCmd.join(' '), {env: env});
  }
}

module.exports = AndroidSdkTools;