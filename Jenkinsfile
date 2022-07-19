node {
    def app
    env.PROJECT_NAME = 'back-email-service'

    try {
        if (env.CHANGE_TITLE) {
            stage('Check PR title') {
                echo "PR title: ${CHANGE_TITLE}"
                def matcher =  CHANGE_TITLE =~ /\[IES-(\d*)\] (.{5,})$/
                if (matcher && matcher[0][1]) {
                    echo "PR title is valid"
                } else {
                    error("PR title is not valid")
                }
            }
        } else {
            stage('Clone repository') {
                checkout scm
            }

            stage('Build image') {
                app = docker.build("itrexio-${PROJECT_NAME}-container")
            }

            withEnv(['npm_config_cache="npm-cache"']) {
                app.inside {
                    stage('NPM install') {
                        sh 'npm install'
                    }

                    stage('Code analyse') {
                        sh 'npm run test:eslint'
                    }

                    stage('Check for copy/paste') {
                        sh 'npm run test:jsinspect'
                    }

                    stage('Unit tests') {
                        sh 'mkdir -p ./mongodb'
                        sh 'mongod --fork --dbpath ./mongodb --logpath ./mongodb.log'
                        sh 'npm run test:unit'
                        sh 'rm -rf ./mongodb'
                    }
                }
            }

            stage ('Deployment') {
                if (BRANCH_NAME == 'develop' || BRANCH_NAME == 'qa') {
                    sh 'echo "Deploying ${PROJECT_NAME} from ${BRANCH_NAME}"'
                    sh 'rm -rf /var/www/itrexio-dev/itrexio-${PROJECT_NAME}';
                    sh 'mkdir /var/www/itrexio-dev/itrexio-${PROJECT_NAME}';
                    sh 'cp -a ./ /var/www/itrexio-dev/itrexio-${PROJECT_NAME}/';
                    sh 'cd /var/www/itrexio-dev/itrexio-${PROJECT_NAME}/';
                    sh 'ssh -i /var/lib/jenkins/ssh_keys/itrexio_ssh.key itrexio@192.168.1.155 "source /home/itrexio/.nvm/nvm.sh; cd /var/www/itrexio-dev/itrexio-${PROJECT_NAME}/; pm2 startOrRestart ecosystem.json"';
                }
            }
        }
    }
    catch (exc) {
        echo "I failed, ${exc}"
        currentBuild.result = 'FAILURE'
    }
    finally {
        echo "One way or another, I have finished";
        deleteDir()
    }
}
