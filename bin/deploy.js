#! /usr/bin/env node
const cp = require('child_process'),
  exec = cp.exec;
const fs = require('fs');
const { Observable } = require('rxjs');
const ceAccess = require('../.env-local.json');
const pkg = require('../package.json');

const env = process.env.npm_config_env || 'prod';
const namespace = process.env.npm_config_namespace || 'mcp-demo';
const name = process.env.npm_config_name;
let appName = process.env.npm_config_appname;
const platform = process.env.npm_config_platform || 'amd64';
const task = process.env.npm_config_task;
const region = process.env.npm_config_region || 'global';
const privateRegion = process.env.npm_config_private || false;
const mode = process.env.npm_config_create == 'true' ? 'create' : 'update';
const version = pkg.version;
const omitCredential = process.env.npm_config_omitcredential == 'true';

let imageName
console.log(task, process.env.npm_config_omitcredential)
if(!task) {
  console.log(`specify --task taskname...`)
  process.exit(0)
}
if(!version) {
  console.log(`version is required:  specify --image-version x.x.x`)
  process.exit(0)
}
if(task == 'doall' || task == 'deploy' || task == 'build' || task == 'push' || task == 'tag') {
  if(!name) {
    console.log(`name is required:  specify --name appname...`)
    process.exit(0)  
  }
  if((task == 'doall' || task == 'deploy' || task == 'tag') && !namespace) {
    console.log(`name is required:  specify --namespace ieam, etc.`)
    process.exit(0)  
  }
  imageName = `${name}-${env}_${platform}:${version}`;
  if(!appName) {
    appName = `${name}-${env}`;
  }
  console.log(appName, imageName)
}

let arch = {
  amd64: 'linux/amd64',
  arm64: 'linux/arm64'
}
let cr = {
  'ap-north':   {public: 'jp.icr.io', private: 'private.jp.icr.io'},
  'ap-south':   {public: 'au.icr.io', private: 'private.au.icr.io'},
  'br-sao':     {public: 'br.icr.io', private: 'private.br.icr.io'},
  'ca-tor':     {public: 'ca.icr.io', private: 'private.ca.icr.io'},
  'eu-central': {public: 'de.icr.io', private: 'private.de.icr.io'},
  'jp-osa':     {public: 'jp2.icr.io', private: 'private.jp2.icr.io'},
  'uk-south':   {public: 'uk.icr.io', private: 'private.uk.icr.io'},
  'us-south':   {public: 'us.icr.io', private: 'private.us.icr.io'},
  'global':     {public: 'icr.io', private: 'private.icr.io'},
  'dockerhub':  {public: 'docker.io', private: 'docker.io'}
}

let build = {
  doall: () => {
    let arg = 'npm run build'
    build.shell(arg)
    .subscribe(() => {
      let arg = `docker build --platform ${arch[platform]} --no-cache -t ${imageName} .  `
      build.shell(arg,`done building ${imageName} image`, `failed to build ${imageName} image`)
      .subscribe(() => {
        console.log(`region: ${region}`)
        let registry = privateRegion ? cr[region].private : cr[region].public;
        let tagImageName = `${registry}/${namespace}/${name}-${env}_${platform}:${version}`;
        let arg = `docker tag ${imageName} ${tagImageName}`
        build.shell(arg,`done tagging ${imageName} image`, `failed to tage ${imageName} image`)
        .subscribe(() => {
          let arg = `docker push ${tagImageName}`
          build.shell(arg,`done pushing ${tagImageName} image`, `failed to push ${tagImageName} image`)
          .subscribe(() => {
            build.deploy()
          })
        })  
      })
    })
  },
  build: () => {
    let arg = `docker build --platform ${arch[platform]} --no-cache -t ${imageName} .  `
    build.shell(arg,`done building ${imageName} image`, `failed to build ${imageName} image`)
    .subscribe(() => {
      process.exit(0)
    })
  },
  tag: () => {
    let registry = privateRegion ? cr[region].private : cr[region].public;
    let tagImageName = `${registry}/${namespace}/${name}-${env}_${platform}:${version}`;
    let arg = `docker tag ${imageName} ${tagImageName}`
    build.shell(arg,`done tagging ${imageName} image`, `failed to tage ${imageName} image`)
    .subscribe(() => {
      process.exit(0)
    })
  },
  push: () => {
    let registry = privateRegion ? cr[region].private : cr[region].public;
    let tagImageName = `${registry}/${namespace}/${name}-${env}_${platform}:${version}`;
    let arg = `docker push ${tagImageName}`
    build.shell(arg,`done pushing ${tagImageName} image`, `failed to push ${tagImageName} image`)
    .subscribe(() => {
      process.exit(0)
    })
  },
  deploy: () => {
    //build.getEnvVar();
    console.log('omit: ', omitCredential)
    let pEnv = omitCredential ? [] : ceAccess[env];
    let registry = privateRegion ? cr[region].private : cr[region].public;
    let tagImageName = `${registry}/${namespace}/${name}-${env}_${platform}:${version}`;
    let arg = `ibmcloud ce application ${mode} -n ${appName} --image ${tagImageName}`
    if(pEnv.REGISTRY_ACCESS_SECRET) {
      arg += ` --registry-secret ${pEnv.REGISTRY_ACCESS_SECRET}`;
    }
    Object.keys(pEnv).forEach((key) => {
      if(key != 'REGISTRY_ACCESS_SECRET') {
        arg += ` --env ${key}=${pEnv[key]}`
      }
    })
    if(pEnv.length == 0 && ceAccess[env]?.PRIVATE_KEY) {
      arg += ` --env PRIVATE_KEY=${ceAccess[env].PRIVATE_KEY}`;
    }
    // Set to 'true' to disable SSL certificate verification for HTTPS requests (useful for self-signed certificates)
    arg += ` --env DISABLE_SSL_VERIFY=true`;
    
    //console.log(arg);
    //arg += ` --env bucket=${pEnv.bucket} --env HZN_ORG_ID=${pEnv.HZN_ORG_ID}`;
    //arg += ` --env HZN_EXCHANGE_USER_AUTH=${pEnv.HZN_EXCHANGE_USER_AUTH} --env HZN_FSS_CSSURL=${pEnv.HZN_FSS_CSSURL}`;
    //arg += ` --env HZN_EXCHANGE_URL=${pEnv.HZN_EXCHANGE_URL}`;
    console.log('deploying...')
    build.shell(arg,`done add/update ${appName}`, `failed to add/update ${appName}`, false)
    .subscribe({
      complete: () => process.exit(0),
      error: (err) => {
        console.log('specify --create if this is a new service.')
        process.exit(0)
      }
    })
  },
  switchRegion: () => {
    if(region && cr[region]) {
      let arg = `ibmcloud cr region-set ${region} && ibmcloud cr login`
      build.shell(arg,`done switching to ${region}`, `failed to switch to ${region}`, false)
      .subscribe({
        complete: () => process.exit(0),
        error: (err) => {
          process.exit(0)
        }
      })
    } else {
      console.log('Please specify a valid region.')
      process.exit(0);
    }
  },
  appUrl: () => {
    let arg = `ibmcloud ce application get -n ${appName} --output url`
    build.shell(arg)
    .subscribe({
      complete: () => process.exit(0),
      error: (err) => {
        process.exit(0)
      }
    })
  },
  appInfo: () => {
    let arg = `ibmcloud ce application get -n ${appName}`
    build.shell(arg)
    .subscribe({
      complete: () => process.exit(0),
      error: (err) => {
        process.exit(0)
      }
    })
  },
  appLogs: () => {
    let arg = `ibmcloud ce application logs -f -n ${appName}`
    build.shell(arg)
    .subscribe({
      complete: () => process.exit(0),
      error: (err) => {
        process.exit(0)
      }
    })
  },
  shell: (arg, success='command executed successfully', error='command failed', prnStdout=true, options={maxBuffer: 1024 * 2000}) => {
    return new Observable((observer) => {
      console.log(arg);
      let child = exec(arg, options, (err, stdout, stderr) => {
        if(!err) {
          // console.log(stdout);
          console.log(success);
          observer.next(prnStdout ? stdout : '');
          observer.complete();
        } else {
          console.log(`${error}: ${err}`);
          observer.error(err);
        }
      });
      child.stdout.pipe(process.stdout);
      child.on('data', (data) => {
        console.log(data)
      })  
    });
  }
} 

build[task]();