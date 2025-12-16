pipeline {
  agent any

  parameters {
    booleanParam(
      name: 'APPLY_CONFIGMAP',
      defaultValue: false,
      description: 'Apply k8s/configmap.yml (unchecked by default)'
    )
  }

  environment {
    NS  = "shiniasse"
    APP = "student-card-shiniasse"
    IMAGE = "shini4/student-card-shiniasse"
  }

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        sh 'echo "GIT_COMMIT=$GIT_COMMIT"'
      }
    }

    stage('Build & Push (Docker on runner)') {
      options { timeout(time: 30, unit: 'MINUTES') }
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'shiniasse-dockerhub-creds',
          usernameVariable: 'DOCKERHUB_USER',
          passwordVariable: 'DOCKERHUB_PASS'
        )]) {
          sh '''
            set -eu
            echo "$DOCKERHUB_PASS" | docker login -u "$DOCKERHUB_USER" --password-stdin

            docker build \
              -t "${IMAGE}:${GIT_COMMIT}" \
              -t "${IMAGE}:latest" \
              .

            docker push "${IMAGE}:${GIT_COMMIT}"
            docker push "${IMAGE}:latest"

            docker logout || true
          '''
        }
      }
    }

    stage('Deploy to Kubernetes') {
      options { timeout(time: 10, unit: 'MINUTES') }
      steps {
        script {
          def applyCm = params.APPLY_CONFIGMAP ? "true" : "false"

          sh """
            set -eu

            for f in k8s/*.yaml; do
              [ "\$(basename "\$f")" = "configmap.yaml" ] && continue
              kubectl -n "${NS}" apply -f "\$f"
            done

            if [ "${applyCm}" = "true" ]; then
              kubectl -n "${NS}" apply -f k8s/configmap.yaml
            fi

            kubectl -n "${NS}" set image deploy/"${APP}" "${APP}"="${IMAGE}:${GIT_COMMIT}"
            kubectl -n "${NS}" rollout status deploy/"${APP}" --timeout=180s
          """
        }
      }
    }
  }

  post {
    always {
      sh 'docker image prune -f || true'
    }
  }
}
