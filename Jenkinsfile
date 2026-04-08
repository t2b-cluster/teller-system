// =============================================================================
// Teller System — Monorepo CI/CD Pipeline (NestJS + React)
// Push: Harbor (scan/storage) + Artifact Registry (GKE pull)
// Deploy: GKE Cluster
// =============================================================================

pipeline {
  agent any

  environment {
    // Harbor Registry (scan + storage)
    HARBOR_REGISTRY = '34.143.132.140'
    HARBOR_PROJECT  = 't2b'
    IMAGE_TAG       = "${BUILD_NUMBER}-${GIT_COMMIT.take(7)}"

    // Artifact Registry (GKE pull)
    AR_REGISTRY = 'asia-southeast1-docker.pkg.dev/t2b-cluster/t2b'

    // SonarQube
    SONAR_HOST = 'http://localhost:9000'

    // GKE
    GKE_CLUSTER   = 't2b-gke'
    GKE_REGION    = 'asia-southeast1'
    GKE_PROJECT   = 't2b-cluster'
    K8S_NAMESPACE = 'tellersystem_uat'
  }

  options {
    timeout(time: 30, unit: 'MINUTES')
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
    timestamps()
  }

  stages {

    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Detect Changes') {
      steps {
        script {
          // Fetch full history for diff
          sh 'git fetch --unshallow || git fetch --all || true'

          def changes = ''
          def buildAll = false

          // Try multiple diff strategies
          try {
            changes = sh(script: "git diff --name-only HEAD~1 HEAD 2>/dev/null || echo ''", returnStdout: true).trim()
          } catch (Exception e) {
            changes = ''
          }

          if (changes.isEmpty()) {
            try {
              changes = sh(script: "git log --name-only --pretty=format: -1 HEAD 2>/dev/null || echo ''", returnStdout: true).trim()
            } catch (Exception e) {
              changes = ''
            }
          }

          if (changes.isEmpty()) {
            echo "Cannot detect changes — building ALL services"
            buildAll = true
          }

          echo "Changed files:\n${changes ?: '(build all)'}"

          // If changes don't match any service/shared path, build all
          def matchesAnyService = changes.contains('services/') || changes.contains('shared/')
          if (!buildAll && !matchesAnyService) {
            echo "Changed files are outside services/ and shared/ (e.g. Jenkinsfile, k8s/) — building ALL services"
            buildAll = true
          }

          env.SHARED_CHANGED       = (buildAll || changes.contains('shared/')).toString()
          env.BUILD_AUTH            = (buildAll || changes.contains('services/auth-service/') || changes.contains('shared/')).toString()
          env.BUILD_TRANSFER        = (buildAll || changes.contains('services/transfer-service/') || changes.contains('shared/')).toString()
          env.BUILD_TRANSACTION     = (buildAll || changes.contains('services/transaction-service/') || changes.contains('shared/')).toString()
          env.BUILD_RECONCILIATION  = (buildAll || changes.contains('services/reconciliation-service/') || changes.contains('shared/')).toString()
          env.BUILD_NOTIFICATION    = (buildAll || changes.contains('services/notification-service/') || changes.contains('shared/')).toString()
          env.BUILD_FRONTEND        = (buildAll || changes.contains('services/frontend/')).toString()

          def list = []
          if (env.BUILD_AUTH.toBoolean())           list << 'auth-service'
          if (env.BUILD_TRANSFER.toBoolean())       list << 'transfer-service'
          if (env.BUILD_TRANSACTION.toBoolean())    list << 'transaction-service'
          if (env.BUILD_RECONCILIATION.toBoolean()) list << 'reconciliation-service'
          if (env.BUILD_NOTIFICATION.toBoolean())   list << 'notification-service'
          if (env.BUILD_FRONTEND.toBoolean())       list << 'frontend'
          env.SERVICES_TO_BUILD = list.join(',')

          env.ANY_SERVICE_CHANGED = (list.size() > 0).toString()

          echo "ANY_SERVICE_CHANGED = ${env.ANY_SERVICE_CHANGED}"
          echo "Services to build: ${env.SERVICES_TO_BUILD}"
        }
      }
    }

    stage('Gitleaks Scan') {
      when { expression { env.ANY_SERVICE_CHANGED.toBoolean() } }
      steps {
        sh '''
          gitleaks detect \
            --source=. \
            --report-path=gitleaks-report.json \
            --report-format=json \
            --exit-code=1 \
            --verbose || true
        '''
      }
      post {
        always {
          archiveArtifacts artifacts: 'gitleaks-report.json', allowEmptyArchive: true
        }
      }
    }

    stage('Build Images') {
      when { expression { env.ANY_SERVICE_CHANGED.toBoolean() } }
      steps {
        script {
          def services = env.SERVICES_TO_BUILD.split(',')
          for (svc in services) {
            def harborImage = "${HARBOR_REGISTRY}/${HARBOR_PROJECT}/${svc}:${IMAGE_TAG}"
            def arImage     = "${AR_REGISTRY}/${svc}:${IMAGE_TAG}"
            sh """
              docker build -t ${harborImage} -f services/${svc}/Dockerfile .
              docker tag ${harborImage} ${HARBOR_REGISTRY}/${HARBOR_PROJECT}/${svc}:latest
              docker tag ${harborImage} ${arImage}
              docker tag ${harborImage} ${AR_REGISTRY}/${svc}:latest
            """
          }
        }
      }
    }

    stage('Trivy Scan') {
      when { expression { env.ANY_SERVICE_CHANGED.toBoolean() } }
      steps {
        script {
          def services = env.SERVICES_TO_BUILD.split(',')
          for (svc in services) {
            def harborImage = "${HARBOR_REGISTRY}/${HARBOR_PROJECT}/${svc}:${IMAGE_TAG}"
            sh """
              trivy image \
                --severity HIGH,CRITICAL \
                --format json \
                --output trivy-report-${svc}.json \
                --exit-code 0 \
                ${harborImage}
            """
            sh """
              trivy image \
                --severity CRITICAL \
                --exit-code 1 \
                ${harborImage} || true
            """
          }
        }
      }
      post {
        always {
          archiveArtifacts artifacts: 'trivy-report-*.json', allowEmptyArchive: true
        }
      }
    }

    stage('Unit Test + Coverage') {
      when { expression { env.ANY_SERVICE_CHANGED.toBoolean() } }
      steps {
        script {
          def backendMap = [
            'auth-service':           env.BUILD_AUTH,
            'transfer-service':       env.BUILD_TRANSFER,
            'transaction-service':    env.BUILD_TRANSACTION,
            'reconciliation-service': env.BUILD_RECONCILIATION,
            'notification-service':   env.BUILD_NOTIFICATION
          ]
          backendMap.each { svc, flag ->
            if (flag.toBoolean()) {
              dir("services/${svc}") {
                sh 'npm ci --legacy-peer-deps'
                sh 'npm run test:cov -- --ci'
              }
            }
          }
        }
      }
      post {
        always {
          junit allowEmptyResults: true, testResults: '**/coverage/junit.xml'
          publishHTML(target: [
            allowMissing: true,
            reportDir: 'services/transfer-service/coverage/lcov-report',
            reportFiles: 'index.html',
            reportName: 'Coverage'
          ])
        }
      }
    }

    stage('SonarQube Analysis') {
      when { expression { env.ANY_SERVICE_CHANGED.toBoolean() } }
      steps {
        withCredentials([string(credentialsId: 'sonarqube-token', variable: 'SONAR_TOKEN')]) {
          sh """
            docker run --rm \
              --network=host \
              -v \$(pwd):/usr/src \
              -w /usr/src \
              sonarsource/sonar-scanner-cli:latest \
              -Dsonar.projectKey=teller-system \
              -Dsonar.projectName=teller-system \
              -Dsonar.sources=services/ \
              -Dsonar.tests=services/ \
              -Dsonar.test.inclusions=**/*.spec.ts \
              -Dsonar.host.url=${SONAR_HOST} \
              -Dsonar.login=\${SONAR_TOKEN} \
              -Dsonar.javascript.lcov.reportPaths=**/coverage/lcov.info \
              -Dsonar.exclusions=**/node_modules/**,**/dist/**
          """
        }
      }
    }

    stage('Push Images') {
      when { expression { env.ANY_SERVICE_CHANGED.toBoolean() } }
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'harbor-creds',
          usernameVariable: 'HARBOR_USER',
          passwordVariable: 'HARBOR_PASS'
        )]) {
          script {
            // Push to Harbor
            sh """
              echo \${HARBOR_PASS} | docker login ${HARBOR_REGISTRY} \
                -u \${HARBOR_USER} --password-stdin
            """

            def services = env.SERVICES_TO_BUILD.split(',')
            for (svc in services) {
              sh """
                docker push ${HARBOR_REGISTRY}/${HARBOR_PROJECT}/${svc}:${IMAGE_TAG}
                docker push ${HARBOR_REGISTRY}/${HARBOR_PROJECT}/${svc}:latest
              """
            }

            sh "docker logout ${HARBOR_REGISTRY}"

            // Push to Artifact Registry (GKE pull)
            for (svc in services) {
              sh """
                docker push ${AR_REGISTRY}/${svc}:${IMAGE_TAG}
                docker push ${AR_REGISTRY}/${svc}:latest
              """
            }
          }
        }
      }
    }

    stage('E2E Test (Playwright)') {
      when { expression { env.ANY_SERVICE_CHANGED.toBoolean() } }
      steps {
        dir('e2e') {
          sh 'npm install'
          sh 'npx playwright test --reporter=html || true'
        }
      }
      post {
        always {
          publishHTML(target: [
            allowMissing: true,
            reportDir: 'e2e/playwright-report',
            reportFiles: 'index.html',
            reportName: 'E2E'
          ])
        }
      }
    }

    stage('Deploy to GKE') {
      when { expression { env.ANY_SERVICE_CHANGED.toBoolean() } }
      steps {
        sh """
          export USE_GKE_GCLOUD_AUTH_PLUGIN=True
          gcloud container clusters get-credentials ${GKE_CLUSTER} \
            --region=${GKE_REGION} \
            --project=${GKE_PROJECT} \
            --internal-ip

          kubectl create namespace ${K8S_NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

          sed -i "s|IMAGE_TAG_PLACEHOLDER|${IMAGE_TAG}|g" k8s/*.yaml

          kubectl apply -f k8s/ -n ${K8S_NAMESPACE}
        """
        script {
          def services = env.SERVICES_TO_BUILD.split(',')
          for (svc in services) {
            sh "kubectl rollout status deployment/${svc} -n ${K8S_NAMESPACE} --timeout=300s"
          }
        }
      }
    }

    stage('OWASP ZAP Scan') {
      when { expression { env.ANY_SERVICE_CHANGED.toBoolean() } }
      steps {
        script {
          def serviceUrl = sh(script: """
            kubectl get svc frontend \
              -n ${K8S_NAMESPACE} \
              -o jsonpath='{.spec.clusterIP}' 2>/dev/null || echo ''
          """, returnStdout: true).trim()

          if (serviceUrl) {
            sh """
              mkdir -p zap-report
              docker run --rm \
                -v \$(pwd)/zap-report:/zap/wrk:rw \
                ghcr.io/zaproxy/zaproxy:stable \
                zap-baseline.py \
                  -t http://${serviceUrl}:80 \
                  -r zap-report.html \
                  -J zap-report.json \
                  -l WARN \
                  -I || true
            """
          }
        }
      }
      post {
        always {
          archiveArtifacts artifacts: 'zap-report/**', allowEmptyArchive: true
        }
      }
    }
  }

  post {
    success {
      echo """
        ✅ Pipeline SUCCESS
        Services: ${env.SERVICES_TO_BUILD}
        Image Tag: ${IMAGE_TAG}
        Harbor:    ${HARBOR_REGISTRY}/${HARBOR_PROJECT}
        AR:        ${AR_REGISTRY}
        Deployed:  ${K8S_NAMESPACE}
      """
    }
    failure {
      echo '❌ Pipeline FAILED'
    }
    always {
      script {
        if (env.SERVICES_TO_BUILD) {
          def services = env.SERVICES_TO_BUILD.split(',')
          for (svc in services) {
            sh "docker rmi ${HARBOR_REGISTRY}/${HARBOR_PROJECT}/${svc}:${IMAGE_TAG} || true"
            sh "docker rmi ${HARBOR_REGISTRY}/${HARBOR_PROJECT}/${svc}:latest || true"
            sh "docker rmi ${AR_REGISTRY}/${svc}:${IMAGE_TAG} || true"
            sh "docker rmi ${AR_REGISTRY}/${svc}:latest || true"
          }
        }
      }
      cleanWs()
    }
  }
}
