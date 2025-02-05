#!/bin/sh
 
# Update package lists
apt update -y
apt upgrade -y
 
# Install PostgreSQL, unzip, and other required packages
apt install -y postgresql postgresql-contrib unzip nodejs npm
 
# Start and enable PostgreSQL service
systemctl start postgresql
systemctl enable postgresql
 
# Configure PostgreSQL to allow password authentication
PG_CONF="/etc/postgresql/$(psql -V | awk '{print $3}' | cut -d'.' -f1,2)/main/pg_hba.conf"
 
# Update pg_hba.conf for md5 authentication (password)
sed -i "s/local   all             postgres                                peer/local   all             postgres                                md5/" $PG_CONF
sed -i "s/local   all             all                                     peer/local   all             all                                     md5/" $PG_CONF
 
# Restart PostgreSQL to apply changes
systemctl restart postgresql
 
# Set the password for the 'postgres' user
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'password123';"
 
# Create the database 'csye6225'
su - postgres -c "psql -c 'CREATE DATABASE csye6225Cloud;'"
 
# Create a new Linux group for the application
groupadd appgroup
 
# Create a new user for the application
useradd -m -g appgroup appuser
 
# Create application directory
mkdir -p /opt/csye6225
 
# Unzip the application
unzip /tmp/webapp.zip -d /opt/csye6225/
 
# Set permissions
chown -R appuser:appgroup /opt/csye6225
chmod -R 750 /opt/csye6225
 
echo "Setup completed successfully!"
 
has context menu