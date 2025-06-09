from google.cloud import secretmanager
from google.oauth2 import service_account
from google.api_core import exceptions
import grpc

PROJECT_ID = "nutriplan-7wkxu"
credentials = service_account.Credentials.from_service_account_file('service_acc_key.json')
client = secretmanager.SecretManagerServiceClient(credentials=credentials)


def create_secret(secret_id,payload):
    # Create the Secret Manager client.
	client = secretmanager.SecretManagerServiceClient()
    # Build the resource name of the parent project.
	parent = f"projects/{PROJECT_ID}"
    # Build a dict of settings for the secret
	secret = {'replication': {'automatic': {}}}
    # Create the secret
	try:
		response = client.create_secret(secret_id=secret_id, parent=parent, secret=secret)
		print(f'Added secret : {response.name}')   
	except exceptions.AlreadyExists as e:
		print(f'Secret {secret_id} already exists, skipping creation')
		return
	parent = f"projects/{PROJECT_ID}/secrets/{secret_id}"

    # Convert the string payload into a bytes. This step can be omitted if you
    # pass in bytes instead of a str for the payload argument.
	payload = payload.encode('UTF-8')

    # Add the secret version.	
	response = client.add_secret_version(parent=parent, payload={'data': payload})

    # Print the new secret version name.
	print(f'Added secret version: {response.name}')   

f = open(".env")
while line := f.readline():
	print(f"firebase apphosting:secrets:grantaccess {line.split('=')[0]} -b {PROJECT_ID} --project {PROJECT_ID}")