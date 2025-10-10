# Update Node Policy Tool Examples

## Example 1: Add a deployment property to an existing node policy

```json
{
  "name": "dragon-thigh",
  "deploymentProperty": {
    "name": "web-hello-python",
    "value": "Web Hello Python"
  }
}
```

## Example 2: Replace an entire node policy

```json
{
  "name": "dragon-thigh",
  "policy": {
    "properties": [
      {
        "name": "openhorizon.allowPrivileged",
        "value": true
      },
      {
        "name": "openhorizon.arch",
        "value": "amd64"
      },
      {
        "name": "openhorizon.cpu",
        "value": 2
      },
      {
        "name": "openhorizon.memory",
        "value": 3911
      }
    ],
    "constraints": [],
    "deployment": {
      "properties": [
        {
          "name": "mms-agent",
          "value": "MMS Agent"
        },
        {
          "name": "worker-safety",
          "value": "Worker Safety"
        },
        {
          "name": "policy-editor",
          "value": "Policy Editor"
        },
        {
          "name": "liquid-prep",
          "value": "Liquid Prep"
        },
        {
          "name": "web-hello-python",
          "value": "Web Hello Python"
        }
      ]
    }
  }
}
```

## Example 3: Update a node policy in a different organization

```json
{
  "name": "dragon-thigh",
  "org": "myorg",
  "deploymentProperty": {
    "name": "web-hello-python",
    "value": "Web Hello Python"
  }
}