/**
 * Test fixtures copied from the TM Forum model repository (tm-forum-model): the published v1 schemas
 * and every deploymentDefinition value in its examples. Generated; do not edit by hand.
 */
/* eslint-disable */
export const DEPLOYMENT_DEFINITION_V1_URL = "https://tm-forum-model-66feba.pages.o-cei.eu/schemas/v1/deployment-definition.json";
export const DEPLOYMENT_DEFINITION_V1: any = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://tm-forum-model-66feba.pages.o-cei.eu/schemas/v1/deployment-definition.json",
  "title": "DeploymentDefinition",
  "description": "Deployment descriptor for a SoftwareSupportPackage. The 'type' field says what kind of artifact is deployed (helm, docker or opennebula) and selects the 'properties' sub-schema. It does not choose the executor: the deploy order's relationship does. Describes WHAT is deployed (artifact coordinates and provider value overrides) — never WHERE or under WHICH NAME: the release identity (namespace, deploymentName) is per-deployment data and is carried by the InstalledSoftware created from the ResourceOrder.",
  "type": "object",
  "required": [
    "type",
    "version",
    "properties"
  ],
  "properties": {
    "type": {
      "type": "string",
      "enum": [
        "helm",
        "docker",
        "opennebula"
      ],
      "description": "Deployment backend type. Determines which 'properties' sub-schema applies."
    },
    "version": {
      "type": "string",
      "description": "Schema version of this deployment definition."
    },
    "properties": {
      "type": "object",
      "description": "Backend-specific deployment parameters. Shape depends on 'type'."
    }
  },
  "oneOf": [
    {
      "title": "HelmDeploymentDefinition",
      "properties": {
        "type": {
          "const": "helm"
        },
        "properties": {
          "type": "object",
          "required": [
            "repository",
            "chart",
            "version"
          ],
          "additionalProperties": false,
          "properties": {
            "repository": {
              "type": "string",
              "format": "uri",
              "description": "Helm chart repository URL."
            },
            "chart": {
              "type": "string",
              "description": "Chart name (e.g. 'examples/hello-world')."
            },
            "version": {
              "type": "string",
              "description": "Chart version (semver)."
            },
            "values": {
              "type": "string",
              "description": "YAML string of provider DEFAULTS — overridable. Applied by the BPO on top of the chart's own values.yaml and below everything the consumer sets, so a consumer may change any key declared here. Use it to ship sane defaults for values the provider does not control, typically when packaging an upstream chart that cannot be forked."
            },
            "enforcedValues": {
              "type": "string",
              "description": "YAML string of provider LOCKS — not overridable. Applied last, after every consumer value and after any Blueprint wiring, so a key declared here cannot be changed by anyone. Use it for what must hold for the product to be the product that was sold: the image tag an offering is priced on, a security setting, a topology the support contract assumes. An order that sets a locked key is rejected, never silently clamped. Locks are per leaf: locking resources.limits.memory leaves resources.limits.cpu free. The docker branch has no equivalent yet because it has no defaults channel either — both are a deliberate follow-up."
            }
          }
        }
      }
    },
    {
      "title": "DockerDeploymentDefinition",
      "properties": {
        "type": {
          "const": "docker"
        },
        "properties": {
          "type": "object",
          "required": [
            "image"
          ],
          "additionalProperties": false,
          "properties": {
            "image": {
              "type": "string",
              "description": "Docker image reference (e.g. 'registry.example.com/myapp')."
            },
            "tag": {
              "type": "string",
              "default": "latest",
              "description": "Image tag."
            },
            "composeFile": {
              "type": "string",
              "description": "Inline docker-compose YAML content. Used when artifactType is DockerCompose."
            },
            "envFile": {
              "type": "string",
              "description": "Path or inline content of environment variables file."
            }
          }
        }
      }
    },
    {
      "title": "OpenNebulaDeploymentDefinition",
      "properties": {
        "type": {
          "const": "opennebula"
        },
        "properties": {
          "type": "object",
          "required": [
            "backend"
          ],
          "additionalProperties": false,
          "properties": {
            "backend": {
              "type": "string",
              "enum": [
                "vm",
                "lxc",
                "oneks",
                "oneflow"
              ],
              "title": "Backend",
              "description": "What OpenNebula creates: a VM from an approved VM template (vm), an LXC system container from an approved template (lxc), a Kubernetes cluster (oneks) or a multi-VM service from an approved OneFlow service template (oneflow). A Helm application goes on a OneKS cluster in a separate order."
            },
            "templateId": {
              "type": "integer",
              "minimum": 0,
              "title": "VM template",
              "description": "ID of the approved OpenNebula VM template. Required for vm and lxc. For lxc the template must declare HYPERVISOR=\"lxc\" or none."
            },
            "serviceTemplateId": {
              "type": "integer",
              "minimum": 0,
              "title": "OneFlow service template",
              "description": "ID of the approved OneFlow service template. Required for oneflow."
            },
            "kubernetesVersion": {
              "type": "string",
              "pattern": "^v[0-9]+\\.[0-9]+\\.[0-9]+$",
              "title": "Kubernetes version",
              "description": "Kubernetes version of the OneKS cluster, for example v1.34.2. Required for oneks."
            },
            "flavour": {
              "type": "string",
              "enum": [
                "standalone",
                "ha"
              ],
              "default": "standalone",
              "title": "Control plane",
              "description": "OneKS control plane: one node (standalone) or three nodes (ha). Only for oneks."
            },
            "description": {
              "type": "string",
              "title": "Cluster description",
              "description": "Free text shown with the OneKS cluster in OpenNebula. Only for oneks."
            },
            "workers": {
              "type": "integer",
              "minimum": 0,
              "title": "Worker nodes",
              "description": "Number of worker nodes. A new OneKS cluster starts with its control plane only, so this applies to an update, which scales the node group of the running cluster to this number. If the cluster has no node group and this number isn't 0, the update creates one with this number of nodes. The consumer sets it with the opennebulaOverride characteristic. Here it is the provider's value, which an update uses when the order sets none, and enforcedValues can lock it. Only for oneks."
            },
            "nodeGroup": {
              "type": "string",
              "minLength": 1,
              "title": "Node group",
              "description": "Name of the node group an update scales. Required when the cluster has more than one node group. If the cluster has node groups and none has this name, the update is refused. If the cluster has no node group, the update creates one with this name, or \"workers\" when this field isn't set. The consumer can also set it with the opennebulaOverride characteristic. Only for oneks."
            },
            "workerFlavour": {
              "type": "string",
              "minLength": 1,
              "default": "small",
              "title": "Worker flavour",
              "description": "OneKS flavour of the node group that an update creates when the cluster has no node group. Only for oneks."
            },
            "persistent": {
              "type": "boolean",
              "default": false,
              "title": "Persistent disks",
              "description": "Instantiate with persistent copies of the template images, so they survive the VM or container. Only for vm and lxc."
            },
            "servicePort": {
              "type": "integer",
              "minimum": 1,
              "maximum": 65535,
              "title": "Service port",
              "description": "Port the application listens on. The BPO publishes it with each address in the TMF638 Service, only when the product declares a ServiceSpecification. For lxc with a healthCheck, the BPO publishes the port, protocol and path of the health check instead. For vm, lxc and oneflow."
            },
            "context": {
              "type": "object",
              "additionalProperties": {
                "type": "string"
              },
              "propertyNames": {
                "pattern": "^[A-Z][A-Z0-9_]*$"
              },
              "title": "Context variables",
              "description": "OpenNebula CONTEXT variables for the container, with upper-case names and string values. Only for lxc."
            },
            "healthCheck": {
              "type": "object",
              "additionalProperties": false,
              "title": "Health check",
              "description": "HTTP check the BPO runs on each LXC container before it reports the deployment as running. Only for lxc.",
              "properties": {
                "protocol": {
                  "type": "string",
                  "enum": [
                    "http",
                    "https"
                  ],
                  "default": "http",
                  "title": "Protocol",
                  "description": "Protocol of the check."
                },
                "port": {
                  "type": "integer",
                  "minimum": 1,
                  "maximum": 65535,
                  "title": "Port",
                  "description": "Port of the check. Defaults to servicePort, or 80."
                },
                "path": {
                  "type": "string",
                  "pattern": "^/(?!/)",
                  "default": "/",
                  "title": "Path",
                  "description": "Path of the check."
                },
                "expectedStatus": {
                  "type": "integer",
                  "minimum": 100,
                  "maximum": 599,
                  "default": 200,
                  "title": "Expected status",
                  "description": "HTTP status that means healthy."
                },
                "restartMarkerPath": {
                  "type": "string",
                  "pattern": "^/(?!/)",
                  "title": "Restart marker path",
                  "description": "Path that changes after a restart, so the BPO can confirm one."
                }
              }
            },
            "timeoutSeconds": {
              "type": "integer",
              "minimum": 1,
              "maximum": 3600,
              "title": "Timeout",
              "description": "Longest time, in seconds and up to one hour, that the BPO waits for the resource to be ready where it waits for it: the LXC health check, a RUNNING OneKS cluster, and the addresses of VMs and OneFlow services. For lxc it is one budget for the whole deployment, which covers the creation of the containers, the wait for RUNNING and the health check. For all backends."
            },
            "enforcedValues": {
              "type": "object",
              "propertyNames": {
                "enum": [
                  "templateId",
                  "serviceTemplateId",
                  "kubernetesVersion",
                  "flavour",
                  "description",
                  "workers",
                  "nodeGroup",
                  "workerFlavour",
                  "persistent",
                  "servicePort",
                  "context",
                  "healthCheck"
                ]
              },
              "title": "Provider locks",
              "description": "Fields of this branch that the provider locks, as an object, for example {\"templateId\": 237}. The BPO applies them last for every backend, so no order can change them. Locks are per leaf: in an object field such as context or healthCheck, an order can't change the locked keys but can add other keys. An order that sets a locked field to another value is rejected, never silently changed."
            }
          },
          "allOf": [
            {
              "if": {
                "properties": {
                  "backend": {
                    "const": "vm"
                  }
                }
              },
              "then": {
                "required": [
                  "templateId"
                ],
                "properties": {
                  "serviceTemplateId": false,
                  "kubernetesVersion": false,
                  "flavour": false,
                  "description": false,
                  "workers": false,
                  "nodeGroup": false,
                  "workerFlavour": false,
                  "context": false,
                  "healthCheck": false,
                  "enforcedValues": {
                    "propertyNames": {
                      "enum": [
                        "templateId",
                        "persistent",
                        "servicePort"
                      ]
                    }
                  }
                }
              }
            },
            {
              "if": {
                "properties": {
                  "backend": {
                    "const": "lxc"
                  }
                }
              },
              "then": {
                "required": [
                  "templateId"
                ],
                "properties": {
                  "serviceTemplateId": false,
                  "kubernetesVersion": false,
                  "flavour": false,
                  "description": false,
                  "workers": false,
                  "nodeGroup": false,
                  "workerFlavour": false,
                  "enforcedValues": {
                    "propertyNames": {
                      "enum": [
                        "templateId",
                        "persistent",
                        "servicePort",
                        "context",
                        "healthCheck"
                      ]
                    }
                  }
                }
              }
            },
            {
              "if": {
                "properties": {
                  "backend": {
                    "const": "oneks"
                  }
                }
              },
              "then": {
                "required": [
                  "kubernetesVersion"
                ],
                "properties": {
                  "templateId": false,
                  "serviceTemplateId": false,
                  "persistent": false,
                  "servicePort": false,
                  "context": false,
                  "healthCheck": false,
                  "enforcedValues": {
                    "propertyNames": {
                      "enum": [
                        "kubernetesVersion",
                        "flavour",
                        "description",
                        "workers",
                        "nodeGroup",
                        "workerFlavour"
                      ]
                    }
                  }
                }
              }
            },
            {
              "if": {
                "properties": {
                  "backend": {
                    "const": "oneflow"
                  }
                }
              },
              "then": {
                "required": [
                  "serviceTemplateId"
                ],
                "properties": {
                  "templateId": false,
                  "kubernetesVersion": false,
                  "flavour": false,
                  "description": false,
                  "workers": false,
                  "nodeGroup": false,
                  "workerFlavour": false,
                  "persistent": false,
                  "context": false,
                  "healthCheck": false,
                  "enforcedValues": {
                    "propertyNames": {
                      "enum": [
                        "serviceTemplateId",
                        "servicePort"
                      ]
                    }
                  }
                }
              }
            }
          ]
        }
      }
    }
  ]
};

/** v1 plus contentMediaType annotations; the current version. */
export const DEPLOYMENT_DEFINITION_V2_URL = "https://tm-forum-model-66feba.pages.o-cei.eu/schemas/v2/deployment-definition.json";
export const DEPLOYMENT_DEFINITION_V2: any = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://tm-forum-model-66feba.pages.o-cei.eu/schemas/v2/deployment-definition.json",
  "title": "DeploymentDefinition",
  "description": "Deployment descriptor for a SoftwareSupportPackage. The 'type' field says what kind of artifact is deployed (helm, docker or opennebula) and selects the 'properties' sub-schema. It does not choose the executor: the deploy order's relationship does. Describes WHAT is deployed (artifact coordinates and provider value overrides) — never WHERE or under WHICH NAME: the release identity (namespace, deploymentName) is per-deployment data and is carried by the InstalledSoftware created from the ResourceOrder.",
  "type": "object",
  "required": [
    "type",
    "version",
    "properties"
  ],
  "properties": {
    "type": {
      "type": "string",
      "enum": [
        "helm",
        "docker",
        "opennebula"
      ],
      "description": "Deployment backend type. Determines which 'properties' sub-schema applies."
    },
    "version": {
      "type": "string",
      "description": "Schema version of this deployment definition."
    },
    "properties": {
      "type": "object",
      "description": "Backend-specific deployment parameters. Shape depends on 'type'."
    }
  },
  "oneOf": [
    {
      "title": "HelmDeploymentDefinition",
      "properties": {
        "type": {
          "const": "helm"
        },
        "properties": {
          "type": "object",
          "required": [
            "repository",
            "chart",
            "version"
          ],
          "additionalProperties": false,
          "properties": {
            "repository": {
              "type": "string",
              "format": "uri",
              "description": "Helm chart repository URL."
            },
            "chart": {
              "type": "string",
              "description": "Chart name (e.g. 'examples/hello-world')."
            },
            "version": {
              "type": "string",
              "description": "Chart version (semver)."
            },
            "values": {
              "type": "string",
              "contentMediaType": "application/yaml",
              "description": "YAML string of provider DEFAULTS — overridable. Applied by the BPO on top of the chart's own values.yaml and below everything the consumer sets, so a consumer may change any key declared here. Use it to ship sane defaults for values the provider does not control, typically when packaging an upstream chart that cannot be forked."
            },
            "enforcedValues": {
              "type": "string",
              "contentMediaType": "application/yaml",
              "description": "YAML string of provider LOCKS — not overridable. Applied last, after every consumer value and after any Blueprint wiring, so a key declared here cannot be changed by anyone. Use it for what must hold for the product to be the product that was sold: the image tag an offering is priced on, a security setting, a topology the support contract assumes. An order that sets a locked key is rejected, never silently clamped. Locks are per leaf: locking resources.limits.memory leaves resources.limits.cpu free. The docker branch has no equivalent yet because it has no defaults channel either — both are a deliberate follow-up."
            }
          }
        }
      }
    },
    {
      "title": "DockerDeploymentDefinition",
      "properties": {
        "type": {
          "const": "docker"
        },
        "properties": {
          "type": "object",
          "required": [
            "image"
          ],
          "additionalProperties": false,
          "properties": {
            "image": {
              "type": "string",
              "description": "Docker image reference (e.g. 'registry.example.com/myapp')."
            },
            "tag": {
              "type": "string",
              "default": "latest",
              "description": "Image tag."
            },
            "composeFile": {
              "type": "string",
              "contentMediaType": "application/yaml",
              "description": "Inline docker-compose YAML content. Used when artifactType is DockerCompose."
            },
            "envFile": {
              "type": "string",
              "contentMediaType": "text/plain",
              "description": "Path or inline content of environment variables file."
            }
          }
        }
      }
    },
    {
      "title": "OpenNebulaDeploymentDefinition",
      "properties": {
        "type": {
          "const": "opennebula"
        },
        "properties": {
          "type": "object",
          "required": [
            "backend"
          ],
          "additionalProperties": false,
          "properties": {
            "backend": {
              "type": "string",
              "enum": [
                "vm",
                "lxc",
                "oneks",
                "oneflow"
              ],
              "title": "Backend",
              "description": "What OpenNebula creates: a VM from an approved VM template (vm), an LXC system container from an approved template (lxc), a Kubernetes cluster (oneks) or a multi-VM service from an approved OneFlow service template (oneflow). A Helm application goes on a OneKS cluster in a separate order."
            },
            "templateId": {
              "type": "integer",
              "minimum": 0,
              "title": "VM template",
              "description": "ID of the approved OpenNebula VM template. Required for vm and lxc. For lxc the template must declare HYPERVISOR=\"lxc\" or none."
            },
            "serviceTemplateId": {
              "type": "integer",
              "minimum": 0,
              "title": "OneFlow service template",
              "description": "ID of the approved OneFlow service template. Required for oneflow."
            },
            "kubernetesVersion": {
              "type": "string",
              "pattern": "^v[0-9]+\\.[0-9]+\\.[0-9]+$",
              "title": "Kubernetes version",
              "description": "Kubernetes version of the OneKS cluster, for example v1.34.2. Required for oneks."
            },
            "flavour": {
              "type": "string",
              "enum": [
                "standalone",
                "ha"
              ],
              "default": "standalone",
              "title": "Control plane",
              "description": "OneKS control plane: one node (standalone) or three nodes (ha). Only for oneks."
            },
            "description": {
              "type": "string",
              "title": "Cluster description",
              "description": "Free text shown with the OneKS cluster in OpenNebula. Only for oneks."
            },
            "workers": {
              "type": "integer",
              "minimum": 0,
              "title": "Worker nodes",
              "description": "Number of worker nodes. A new OneKS cluster starts with its control plane only, so this applies to an update, which scales the node group of the running cluster to this number. If the cluster has no node group and this number isn't 0, the update creates one with this number of nodes. The consumer sets it with the opennebulaOverride characteristic. Here it is the provider's value, which an update uses when the order sets none, and enforcedValues can lock it. Only for oneks."
            },
            "nodeGroup": {
              "type": "string",
              "minLength": 1,
              "title": "Node group",
              "description": "Name of the node group an update scales. Required when the cluster has more than one node group. If the cluster has node groups and none has this name, the update is refused. If the cluster has no node group, the update creates one with this name, or \"workers\" when this field isn't set. The consumer can also set it with the opennebulaOverride characteristic. Only for oneks."
            },
            "workerFlavour": {
              "type": "string",
              "minLength": 1,
              "default": "small",
              "title": "Worker flavour",
              "description": "OneKS flavour of the node group that an update creates when the cluster has no node group. Only for oneks."
            },
            "persistent": {
              "type": "boolean",
              "default": false,
              "title": "Persistent disks",
              "description": "Instantiate with persistent copies of the template images, so they survive the VM or container. Only for vm and lxc."
            },
            "servicePort": {
              "type": "integer",
              "minimum": 1,
              "maximum": 65535,
              "title": "Service port",
              "description": "Port the application listens on. The BPO publishes it with each address in the TMF638 Service, only when the product declares a ServiceSpecification. For lxc with a healthCheck, the BPO publishes the port, protocol and path of the health check instead. For vm, lxc and oneflow."
            },
            "context": {
              "type": "object",
              "additionalProperties": {
                "type": "string"
              },
              "propertyNames": {
                "pattern": "^[A-Z][A-Z0-9_]*$"
              },
              "title": "Context variables",
              "description": "OpenNebula CONTEXT variables for the container, with upper-case names and string values. Only for lxc."
            },
            "healthCheck": {
              "type": "object",
              "additionalProperties": false,
              "title": "Health check",
              "description": "HTTP check the BPO runs on each LXC container before it reports the deployment as running. Only for lxc.",
              "properties": {
                "protocol": {
                  "type": "string",
                  "enum": [
                    "http",
                    "https"
                  ],
                  "default": "http",
                  "title": "Protocol",
                  "description": "Protocol of the check."
                },
                "port": {
                  "type": "integer",
                  "minimum": 1,
                  "maximum": 65535,
                  "title": "Port",
                  "description": "Port of the check. Defaults to servicePort, or 80."
                },
                "path": {
                  "type": "string",
                  "pattern": "^/(?!/)",
                  "default": "/",
                  "title": "Path",
                  "description": "Path of the check."
                },
                "expectedStatus": {
                  "type": "integer",
                  "minimum": 100,
                  "maximum": 599,
                  "default": 200,
                  "title": "Expected status",
                  "description": "HTTP status that means healthy."
                },
                "restartMarkerPath": {
                  "type": "string",
                  "pattern": "^/(?!/)",
                  "title": "Restart marker path",
                  "description": "Path that changes after a restart, so the BPO can confirm one."
                }
              }
            },
            "timeoutSeconds": {
              "type": "integer",
              "minimum": 1,
              "maximum": 3600,
              "title": "Timeout",
              "description": "Longest time, in seconds and up to one hour, that the BPO waits for the resource to be ready where it waits for it: the LXC health check, a RUNNING OneKS cluster, and the addresses of VMs and OneFlow services. For lxc it is one budget for the whole deployment, which covers the creation of the containers, the wait for RUNNING and the health check. For all backends."
            },
            "enforcedValues": {
              "type": "object",
              "propertyNames": {
                "enum": [
                  "templateId",
                  "serviceTemplateId",
                  "kubernetesVersion",
                  "flavour",
                  "description",
                  "workers",
                  "nodeGroup",
                  "workerFlavour",
                  "persistent",
                  "servicePort",
                  "context",
                  "healthCheck"
                ]
              },
              "title": "Provider locks",
              "description": "Fields of this branch that the provider locks, as an object, for example {\"templateId\": 237}. The BPO applies them last for every backend, so no order can change them. Locks are per leaf: in an object field such as context or healthCheck, an order can't change the locked keys but can add other keys. An order that sets a locked field to another value is rejected, never silently changed."
            }
          },
          "allOf": [
            {
              "if": {
                "properties": {
                  "backend": {
                    "const": "vm"
                  }
                }
              },
              "then": {
                "required": [
                  "templateId"
                ],
                "properties": {
                  "serviceTemplateId": false,
                  "kubernetesVersion": false,
                  "flavour": false,
                  "description": false,
                  "workers": false,
                  "nodeGroup": false,
                  "workerFlavour": false,
                  "context": false,
                  "healthCheck": false,
                  "enforcedValues": {
                    "propertyNames": {
                      "enum": [
                        "templateId",
                        "persistent",
                        "servicePort"
                      ]
                    }
                  }
                }
              }
            },
            {
              "if": {
                "properties": {
                  "backend": {
                    "const": "lxc"
                  }
                }
              },
              "then": {
                "required": [
                  "templateId"
                ],
                "properties": {
                  "serviceTemplateId": false,
                  "kubernetesVersion": false,
                  "flavour": false,
                  "description": false,
                  "workers": false,
                  "nodeGroup": false,
                  "workerFlavour": false,
                  "enforcedValues": {
                    "propertyNames": {
                      "enum": [
                        "templateId",
                        "persistent",
                        "servicePort",
                        "context",
                        "healthCheck"
                      ]
                    }
                  }
                }
              }
            },
            {
              "if": {
                "properties": {
                  "backend": {
                    "const": "oneks"
                  }
                }
              },
              "then": {
                "required": [
                  "kubernetesVersion"
                ],
                "properties": {
                  "templateId": false,
                  "serviceTemplateId": false,
                  "persistent": false,
                  "servicePort": false,
                  "context": false,
                  "healthCheck": false,
                  "enforcedValues": {
                    "propertyNames": {
                      "enum": [
                        "kubernetesVersion",
                        "flavour",
                        "description",
                        "workers",
                        "nodeGroup",
                        "workerFlavour"
                      ]
                    }
                  }
                }
              }
            },
            {
              "if": {
                "properties": {
                  "backend": {
                    "const": "oneflow"
                  }
                }
              },
              "then": {
                "required": [
                  "serviceTemplateId"
                ],
                "properties": {
                  "templateId": false,
                  "kubernetesVersion": false,
                  "flavour": false,
                  "description": false,
                  "workers": false,
                  "nodeGroup": false,
                  "workerFlavour": false,
                  "persistent": false,
                  "context": false,
                  "healthCheck": false,
                  "enforcedValues": {
                    "propertyNames": {
                      "enum": [
                        "serviceTemplateId",
                        "servicePort"
                      ]
                    }
                  }
                }
              }
            }
          ]
        }
      }
    }
  ]
};

export const BLUEPRINT_PRODUCT_SPEC_V1_URL = "https://tm-forum-model-66feba.pages.o-cei.eu/schemas/v1/blueprint-product-spec.json";
export const BLUEPRINT_PRODUCT_SPEC_V1: any = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://tm-forum-model-66feba.pages.o-cei.eu/schemas/v1/blueprint-product-spec.json",
  "title": "BlueprintProductSpecification — additional-properties schema",
  "description": "Validation schema for the additional properties that distinguish a BlueprintProductSpecification (typed subtype of TMF620 ProductSpecification) from its base. The FIWARE TMForum API server's ValidatingDeserializer (common/.../ValidatingDeserializer.java) only passes the UNKNOWN subset of the incoming payload to schema validation — fields declared in the base ProductSpecification class (@type, @baseType, @schemaLocation, id, href, name, isBundle, productSpecificationRelationship, productSpecCharacteristic, validFor, relatedParty, brand, lifecycleStatus, version, description, …) are filtered out before validation reaches this schema, plus @type itself is removed explicitly as a polymorphism discriminator. Therefore this schema MUST describe only what the subtype ADDS on top of the base: the typed orchestrationPlan field. The full orchestration-plan shape is inlined below — this file is the single source of truth for the Blueprint subtype schema, both locally and in the gist published at @schemaLocation, so the server can fetch one URL and validate without cross-resource $ref hops.",
  "type": "object",
  "required": [
    "orchestrationPlan"
  ],
  "additionalProperties": true,
  "definitions": {
    "characteristic": {
      "type": "object",
      "description": "A TMF Characteristic: name, optional valueType, and a value of any shape. Shared by installedSoftwareTemplate.resourceCharacteristic and by enforcedCharacteristic so the two cannot drift.",
      "required": [
        "name",
        "value"
      ],
      "properties": {
        "name": {
          "type": "string"
        },
        "valueType": {
          "type": "string"
        },
        "value": {}
      },
      "additionalProperties": true
    }
  },
  "properties": {
    "orchestrationPlan": {
      "type": "object",
      "description": "DAG declaring how the Blueprint must deploy its component Products. Each step targets one component (identified by its ProductSpecification URN) with explicit dependsOn links to form a directed acyclic graph. The BPO must additionally validate at runtime that there are no cycles and no dangling dependsOn references (neither constraint is expressible in pure JSON Schema).",
      "required": [
        "steps"
      ],
      "additionalProperties": false,
      "properties": {
        "version": {
          "type": "string",
          "description": "Optional schema/format version of this orchestration plan instance."
        },
        "steps": {
          "type": "array",
          "minItems": 1,
          "description": "Ordered list of deployment steps. Execution order is driven by dependsOn — independent steps may run in parallel.",
          "items": {
            "type": "object",
            "required": [
              "id",
              "componentProductSpec"
            ],
            "additionalProperties": false,
            "properties": {
              "id": {
                "type": "string",
                "pattern": "^[a-z0-9-]+$",
                "description": "Step identifier, unique within the plan. Used in dependsOn references and BPO logs."
              },
              "componentProductSpec": {
                "type": "string",
                "description": "URN of the component ProductSpecification this step deploys. Must match an entry declared in productSpecificationRelationship of the BlueprintProductSpecification."
              },
              "dependsOn": {
                "type": "array",
                "items": {
                  "type": "string"
                },
                "default": [],
                "description": "List of step ids that must complete (and optionally be healthy — see waitForHealthy) before this step starts."
              },
              "waitForHealthy": {
                "type": "boolean",
                "default": true,
                "description": "If true, BPO waits for all dependsOn components to report a healthy state before proceeding. If false, completion of the deploy action is enough."
              },
              "timeoutSeconds": {
                "type": "integer",
                "minimum": 1,
                "default": 600,
                "description": "Maximum time the BPO will wait for this step (helm install + health check) before marking the DAG execution as failed."
              },
              "onFailure": {
                "enum": [
                  "abort",
                  "continue",
                  "retry"
                ],
                "default": "abort",
                "description": "Policy when this step fails. 'abort' stops the DAG and rolls back completed siblings. 'continue' leaves the failure logged but carries on with independent branches. 'retry' attempts the step again (single retry) before applying one of the other policies."
              },
              "installedSoftwareTemplate": {
                "type": "object",
                "additionalProperties": true,
                "description": "Layer 3a — per-component DEFAULT values fixed by the Blueprint provider. A partial InstalledSoftware (TMF730) carrying resourceCharacteristic[] in the canonical TMF Characteristic format. The polymorphism for heterogeneous deployment types (Helm, Docker, future kustomize/oci-bundle…) is expressed via the characteristic 'name': use 'helmValuesOverride' when the component's SoftwareSupportPackage.deploymentDefinition.type is 'helm', 'dockerEnv' / 'composeOverride' for 'docker', etc. The BPO discriminates on 'name' at runtime against the component's type — name/type mismatch should fail-fast at Blueprint publish time. The consumer's ResourceOrder configure (Phase 3a) carries DELTAS only over this template: any resourceCharacteristic absent in the orderItem.resource falls back to this default; any resourceCharacteristic present in both is merged with the orderItem winning (L3b > L3a). This template is what makes 'one-click configure the Blueprint' possible — the consumer is not forced to repeat the full per-component config that the Blueprint provider already curated.",
                "properties": {
                  "@type": {
                    "type": "string",
                    "const": "InstalledSoftware"
                  },
                  "@baseType": {
                    "type": "string",
                    "const": "Resource"
                  },
                  "name": {
                    "type": "string"
                  },
                  "resourceCharacteristic": {
                    "type": "array",
                    "items": {
                      "$ref": "#/definitions/characteristic"
                    }
                  }
                }
              },
              "enforcedCharacteristic": {
                "type": "array",
                "items": {
                  "$ref": "#/definitions/characteristic"
                },
                "description": "Blueprint LOCKS for this step — the values the consumer must not be able to change, because changing them breaks the composition. Applied after everything the consumer sets and after installedSoftwareTemplate, but BELOW the component provider's own deploymentDefinition.enforcedValues: the component provider owns the artifact and has the last word. A Blueprint locking a key the component already locks with a different value is rejected when the Blueprint is PUBLISHED, naming the key and the component — both sides are in the catalog, so it is checkable, and the ordering is a tiebreak that should never fire.\n\nDeciding where a value goes: if a consumer overriding it would break the Blueprint, it is a lock; otherwise it belongs in installedSoftwareTemplate as a curated default. Inter-component wiring is always a lock; a recommended replica count never is.\n\nPolymorphism is by characteristic 'name', the same convention installedSoftwareTemplate.resourceCharacteristic uses: 'helmValuesOverride' for components whose deploymentDefinition.type is 'helm', 'dockerEnv' / 'composeOverride' for 'docker'. The BPO discriminates on the name against the component's type, and a mismatch should fail at Blueprint publish time.\n\nLocks are per leaf: locking resources.limits.memory leaves .cpu free. NEVER include secrets, tokens or passwords — the orchestrationPlan lives in the public catalog.\n\nSUBSTITUTION PLACEHOLDERS\nString values here may reference another step, because the consumer supplies the release identity per deployment and a sibling's address is therefore not knowable at catalog time. Substitution only: no functions, no conditionals, no loops, no pipelines.\n\n  placeholder := '<<' WS? path WS? '>>'\n  path        := 'steps.' stepId '.' segment ( '.' segment )*\n  stepId      := [a-z0-9-]+\n  segment     := [A-Za-z0-9_-]+\n  WS          := [ \\t]*   (tolerated only immediately inside the delimiters)\n\n'<<steps.' is the reserved prefix; everything else in a string passes through untouched. The delimiter was chosen so that nothing in play collides: Helm and Argo Workflows use '{{ }}' (Argo values contain '{{steps.…}}' literally), shell uses '${ }', Tekton '$( )'. There is therefore NO escaping mechanism and chart values carrying any of those are never affected — a shell heredoc ('cat <<EOF') is untouched too, since only '<<steps.' is special.\n\nRESOLUTION CONTEXT\n  steps.<id>.deploymentName   the release name that step received     — Phase 3a, before helm runs\n  steps.<id>.namespace        the namespace it landed in              — Phase 3a\n  steps.<id>.service.<name>   a characteristic of the TMF638 Service\n                              that step publishes                     — Phase 3b, once it completes\n\nA reference may only target a step listed in this step's dependsOn, and the edge must be direct. For a data dependency without serialising on health, add the edge with waitForHealthy: false. Self-reference is allowed for deploymentName and namespace, not for service. A characteristic name used as a reference target must not itself contain a dot.\n\nRULES\n  1. A string that is EXACTLY one placeholder resolves to the referenced value with its native JSON type; embedded in surrounding text it is string-interpolated, and interpolating an object or array is an error. The BPO must therefore render a values file and 'helm … -f', never '--set', which re-coerces types.\n  2. Placeholders are allowed in values only, including array elements, never in object keys.\n  3. An absent path fails the order before helm runs. A present-but-null value yields native null for an exact placeholder and is an error when interpolated; it is never stringified.\n  4. The BPO resolves this object and THEN merges; it never scans the merged tree. A '<<' written by a consumer is therefore literal by construction, and the assertion that no placeholder survives applies to this resolved fragment only — never to the values handed to Helm, which may legally carry templating of their own from any other layer.\n\nVALIDATION: the marketplace validates grammar, unknown roots, unique step ids, the direct-dependsOn rule and the no-placeholders-in-keys rule at Blueprint publish time. This JSON Schema documents the syntax but does not enforce it — this object holds arbitrary chart values, and the rule that matters (dependsOn) is not expressible here."
              }
            }
          }
        }
      }
    }
  }
};

/** deploymentDefinition values from the examples' sw-support-pkg fixtures, keyed by example/file. */
export const MODEL_DEPLOYMENT_DEFINITIONS: Record<string, any> = {
  "blueprint/cache-sw-support-pkg.json": {
    "type": "helm",
    "version": "1.0",
    "properties": {
      "repository": "https://charts.bitnami.com/bitnami",
      "chart": "redis",
      "version": "19.6.1",
      "values": "architecture: standalone\nauth:\n  enabled: false\nmaster:\n  persistence:\n    enabled: false\n"
    }
  },
  "blueprint/web-sw-support-pkg.json": {
    "type": "helm",
    "version": "1.0",
    "properties": {
      "repository": "https://helm.github.io/examples",
      "chart": "examples/hello-world",
      "version": "0.1.0",
      "values": "replicaCount: 1\nimage:\n  tag: latest"
    }
  },
  "hello-world/sw-support-pkg.json": {
    "type": "helm",
    "version": "1.0",
    "properties": {
      "repository": "https://helm.github.io/examples",
      "chart": "examples/hello-world",
      "version": "0.1.0",
      "values": "replicaCount: 1",
      "enforcedValues": "image:\n  tag: 1.16.0"
    }
  },
  "opennebula/lxc-sw-support-pkg.json": {
    "type": "opennebula",
    "version": "1.0",
    "properties": {
      "backend": "lxc",
      "templateId": 237,
      "servicePort": 80,
      "healthCheck": {
        "protocol": "http",
        "port": 80,
        "path": "/",
        "expectedStatus": 200
      },
      "timeoutSeconds": 600,
      "enforcedValues": {
        "templateId": 237
      }
    }
  },
  "opennebula/oneks-sw-support-pkg.json": {
    "type": "opennebula",
    "version": "1.0",
    "properties": {
      "backend": "oneks",
      "kubernetesVersion": "v1.34.2",
      "flavour": "standalone",
      "description": "OneKS cluster ordered from the O-CEI Marketplace",
      "workerFlavour": "small",
      "timeoutSeconds": 1800,
      "enforcedValues": {
        "kubernetesVersion": "v1.34.2"
      }
    }
  },
  "opennebula/podinfo-sw-support-pkg.json": {
    "type": "helm",
    "version": "1.0",
    "properties": {
      "repository": "https://stefanprodan.github.io/podinfo",
      "chart": "podinfo",
      "version": "6.16.0",
      "values": "replicaCount: 1"
    }
  },
  "orchestrator/sw-support-pkg.json": {
    "type": "helm",
    "version": "1.0",
    "properties": {
      "repository": "https://helm.github.io/examples",
      "chart": "examples/hello-world",
      "version": "0.1.0",
      "values": "replicaCount: 1",
      "enforcedValues": "image:\n  tag: 1.16.0"
    }
  }
};

/** Values as the deployed Portal wrote them against the older gist revision 057beb0 (helm values
 * round-tripped by the broker as a one-element array). They must still load and validate. */
export const LEGACY_DEPLOYMENT_DEFINITIONS: Record<string, any> = {
  "helm-057beb0": {
    "type": "helm",
    "version": "1.0",
    "properties": {
      "repository": "https://helm.github.io/examples",
      "chart": "examples/hello-world",
      "version": "0.2.0",
      "values": [
        "replicaCount: 1"
      ]
    }
  },
  "docker-057beb0": {
    "type": "docker",
    "version": "1.0",
    "properties": {
      "image": "nginx",
      "tag": "1.27",
      "composeFile": "services:\n  web:\n    image: nginx"
    }
  }
};
