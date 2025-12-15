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

    // ВАЖНО:
    // APP должен совпадать с:
    // - metadata.name Deployment
    // - spec.template.spec.containers[0].name (имя контейнера)
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

            # 1) применяем всё, кроме configmap.yml (безопасный дефолт)
            for f in k8s/*.y*ml; do
              [ "\$(basename "\$f")" = "configmap.yml" ] && continue
              kubectl -n "${NS}" apply -f "\$f"
            done

            # 2) опционально обновляем configmap
            #    (значения подставляем из параметров Jenkins)
            if [ "${applyCm}" = "true" ]; then
              cat <<'EOF' | sed \
                -e "s|__FULL_NAME__|${FULL_NAME}|g" \
                -e "s|__STUDENT_GROUP__|${STUDENT_GROUP}|g" \
                -e "s|__UNIVERSITY__|${UNIVERSITY}|g" \
                | kubectl -n "${NS}" apply -f -
                apiVersion: v1
                kind: ConfigMap
                metadata:
                name: student-card-config
                data:
                PORT: "3000"
                FULL_NAME: "__FULL_NAME__"
                STUDENT_GROUP: "__STUDENT_GROUP__"
                UNIVERSITY: "__UNIVERSITY__"
                EOF
            fi

            # 3) обновляем образ на конкретный commit (чёткая версия)
            kubectl -n "${NS}" set image deploy/"${APP}" "${APP}"="${IMAGE}:${GIT_COMMIT}"

            # 4) если обновляли ConfigMap, делаем rolling restart (иначе env не подхватится)
            if [ "${applyCm}" = "true" ]; then
              kubectl -n "${NS}" rollout restart deploy/"${APP}"
            fi

            # 5) ждём без даунтайма (при корректных readiness/maxUnavailable=0)
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
