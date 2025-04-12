packer {
  required_plugins {
    amazon = {
      version = ">= 1.0.0, < 2.0.0"
      source  = "github.com/hashicorp/amazon"
    }

    # googlecompute = {
    #   version = ">= 1.0.0, < 2.0.0"
    #   source  = "github.com/hashicorp/googlecompute"
    # }
  }
}

variable "aws_region" {
  description = "AWS region to deploy the instance"
  default     = "us-east-1"
}

variable "aws_profile" {
  description = "AWS CLI profile to use for authentication"
  default     = "dev"
}

variable "instance_type" {
  description = "AWS EC2 instance type"
  default     = "t3.micro"
}

# GCP Variables
# variable "gcp_project_id" {
#   description = "GCP Project ID"
#   default     = "gcp-dev-452120"
# }

# variable "gcp_region" {
#   description = "GCP Region"
#   default     = "us-east1"
# }

# variable "gcp_zone" {
#   description = "GCP Zone"
#   default     = "us-central1-a"
# }

source "amazon-ebs" "custom_ami" {
  region        = var.aws_region
  profile       = var.aws_profile
  instance_type = var.instance_type
  ami_name      = "custom-ami-{{timestamp}}"
  source_ami_filter {
    filters = {
      name                = "ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"
      root-device-type    = "ebs"
      virtualization-type = "hvm"
    }
    owners      = ["099720109477"] # Canonical
    most_recent = true
  }
  ssh_username = "ubuntu"
}

# GCP Image Source
# source "googlecompute" "custom_gce_image" {
#   project_id          = var.gcp_project_id
#   region              = var.gcp_region
#   zone                = var.gcp_zone
#   machine_type        = "e2-medium"
#   source_image_family = "ubuntu-2204-lts"
#   image_name          = "custom-gce-image-{{timestamp}}"
#   image_family        = "custom-webapp-family"
#   image_description   = "Custom GCE image with PostgreSQL and WebApp"
#   ssh_username        = "ubuntu"
# }

build {
  sources = [
    "source.amazon-ebs.custom_ami",
    # "source.googlecompute.custom_gce_image"
  ]

  provisioner "shell" {
    inline = [
      # Ensure the /opt/webapp directory exists
      "sudo mkdir -p /opt/webapp",
      "sudo chown -R ubuntu:ubuntu /opt/webapp",

      # Create and set permissions for csye6225.log
      "sudo touch /var/log/csye6225.log",
      "sudo chown ubuntu:ubuntu /var/log/csye6225.log", # Change to ubuntu user
      "sudo chmod 644 /var/log/csye6225.log",

    ]
  }

  provisioner "file" {
    source      = "../"
    destination = "/opt/webapp" # Target path in the VM
  }

  provisioner "shell" {
    inline = [
      # Create the user and group
      "sudo groupadd -f csye6225",
      "sudo useradd -m -g csye6225 -s /bin/bash csye6225 || echo 'User csye6225 already exists'",

      # Now, set the correct ownership
      "sudo chown -R csye6225:csye6225 /opt/webapp",
      "sudo chown -R csye6225:csye6225 /var/log/csye6225.log",

      "sudo chmod -R 755 /opt/webapp",
      "sudo chmod -R 755 /var/log/csye6225.log",

      # Ensure package lists are updated
      "sudo apt update -y",
      "sudo apt upgrade -y",
      "sudo apt clean",

      # Ensure 'universe' repository is enabled
      "sudo apt-get install -y software-properties-common",
      "sudo add-apt-repository universe",
      "sudo apt-get update -y",

      # Install required packages, including zip
      "sudo apt install -y curl gnupg lsb-release unzip zip",

      # Install dependencies
      "sudo apt-get install -y unzip curl jq",

      # Install AWS CLI v2
      "cd /tmp",
      "curl 'https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip' -o 'awscliv2.zip'",
      "unzip -q awscliv2.zip",
      "sudo ./aws/install",
      "export PATH=$PATH:/usr/local/bin",

      # # Add PostgreSQL repository and install PostgreSQL
      # "curl https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo tee /etc/apt/trusted.gpg.d/pgdg.asc",
      # "echo \"deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -c | awk '{print $2}')-pgdg main\" | sudo tee /etc/apt/sources.list.d/pgdg.list",
      # "sudo apt update -y",
      # "sudo apt install -y postgresql postgresql-contrib",

      # Install Node.js and npm
      "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -",
      "sudo apt install -y nodejs",

      # # Ensure PostgreSQL service is running and enabled
      # "sudo systemctl enable postgresql",
      # "sudo systemctl start postgresql",

      # # Ensure PostgreSQL configuration allows password authentication
      # "PG_CONF=$(ls /etc/postgresql/*/main/pg_hba.conf) && sudo sed -i 's/local   all             all                                     peer/local   all             all                                     md5/' $PG_CONF",
      # "sudo systemctl restart postgresql",

      # # Set PostgreSQL password and create database
      # "sudo -u postgres psql -c \"ALTER USER postgres WITH PASSWORD 'password123';\"",
      # "sudo -u postgres psql -c \"CREATE DATABASE csye6225;\"",

      # Ensure PostgreSQL client is installed (but not the server)
      "sudo apt install -y postgresql-client",

      # Install npm dependencies
      "cd /opt/webapp && sudo npm install",

      # # Ensure group and user exist
      # "sudo groupadd -f csye6225",
      # "sudo useradd -m -g csye6225 -s /bin/bash csye6225 || echo 'User csye6225 already exists'",

      # # Ensure /opt/webapp exists and zip the contents of the directory
      # "sudo mkdir -p /opt/webapp",
      # "if [ -d /opt/webapp ]; then sudo zip -r /tmp/webapp.zip /opt/webapp; else echo 'WARNING: /opt/webapp directory does not exist, skipping zip.'; fi",

      # # Ensure webapp.zip exists and extract it
      # "if [ -f /tmp/webapp.zip ]; then sudo unzip /tmp/webapp.zip -d /opt/webapp; else echo 'WARNING: /tmp/webapp.zip does not exist, skipping unzip.'; fi",
      # "sudo chown -R csye6225:csye6225 /opt/webapp",

      "sudo rm -f /opt/webapp/.env",

      # Create systemd service for the webapp
      "echo '[Unit]\nDescription=CSYE 6225 App\nConditionPathExists=/opt/webapp/.env\nAfter=network.target\n\n[Service]\nType=simple\nUser=csye6225\nGroup=csye6225\nWorkingDirectory=/opt/webapp\nExecStart=/usr/bin/node /opt/webapp/app.js\nRestart=always\nRestartSec=3\nStandardOutput=syslog\nStandardError=syslog\nSyslogIdentifier=csye6225\n\n[Install]\nWantedBy=multi-user.target' | sudo tee /etc/systemd/system/webapp.service",
      "sudo systemctl daemon-reload",
      "sudo systemctl enable webapp.service"
    ]
  }

  provisioner "shell" {
    inline = [<<EOF
      sudo apt update -y
      sudo mkdir -p /opt/aws/

      # Download the CloudWatch Agent
      cd /opt/aws/ && sudo wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
      sudo dpkg -i /opt/aws/amazon-cloudwatch-agent.deb  # Corrected the deb package name

#       # Create CloudWatch Agent configuration file
#       sudo bash -c 'cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-config.json <<EOF
# {
#   "agent": {
#     "metrics_collection_interval": 10,
#     "logfile": "/var/log/cloudwatch-config.log"
#   },
#   "logs": {
#     "logs_collected": {
#       "files": {
#         "collect_list": [
#           {
#             "file_path": "/var/log/csye6225.log",
#             "log_group_name": "csye6225",
#             "log_stream_name": "webapp"
#           }
#         ]
#       }
#     }
#   },
#   "metrics": {
#     "metrics_collected": {
#       "statsd": {
#         "service_address": ":8125",
#         "metrics_collection_interval": 15,
#         "metrics_aggregation_interval": 300
#       }
#     }
#   }
# }
# EOF'

      # Enable and restart CloudWatch Agent service
      sudo systemctl enable amazon-cloudwatch-agent
    EOF
    ]
  }
}