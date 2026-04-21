import Employes from '../rh/Employes'

/** Même logique CRUD que l’espace RH, avec libellés français (prop adminMode sur Employes). */
export default function AdminEmployees() {
  return <Employes adminMode />
}
